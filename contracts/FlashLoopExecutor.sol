// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FlashLoopExecutor
/// @notice Aave v3 FlashLoanSimple receiver that performs dual-DEX arbitrage (Uni v3 + v2 router) atomically.
///         Splits realized profit between a treasury (Exodus) address and an internal collateral pool.
interface IERC20 {
    function allowance(address owner, address spender) external view returns (uint256);    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

// Uniswap v3 periphery minimal
interface ISwapRouterV3 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;            // pool fee e.g., 500, 3000, 10000
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

// Uniswap v2-compatible router (Sushi/QuickSwap)
interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

library SafeERC20 {
    function safeApprove(IERC20 t, address s, uint256 v) internal {
        bool ok = t.approve(s, v);
        require(ok, "approve failed");
    }
    function safeTransfer(IERC20 t, address to, uint256 v) internal {
        bool ok = t.transfer(to, v);
        require(ok, "transfer failed");
    }
}

contract FlashLoopExecutor is IFlashLoanSimpleReceiver {
    using SafeERC20 for IERC20;

    error OnlyOwner();
    error NoProfit();

    event Profit(uint256 gross, uint256 premium, uint256 net, uint256 toTreasury, uint256 toCollateral);
    event SplitUpdated(uint16 bps);
    event TreasuryUpdated(address exodus);

    address public owner;

    // External endpoints (per-chain constants stored on deploy)
    IPool public immutable AAVE_POOL;
    ISwapRouterV3 public immutable UNI_V3_ROUTER;
    IUniswapV2Router02 public immutable V2_ROUTER; // Sushi (Arb) or QuickSwap (Polygon)

    // Treasury (Exodus) destination & split
    address public treasury; // Exodus wallet on the same chain
    uint16 public profitSplitBps = 4000; // 40% -> treasury by default
    uint16 public constant BPS_DENOM = 10_000;

    modifier onlyOwner() { if (msg.sender != owner) revert OnlyOwner(); _; }

    constructor(address aavePool, address uniV3, address v2router, address treasury_) {
        owner = msg.sender;
        AAVE_POOL = IPool(aavePool);
        UNI_V3_ROUTER = ISwapRouterV3(uniV3);
        V2_ROUTER = IUniswapV2Router02(v2router);
        treasury = treasury_;
    }

    struct ArbLegV3 {
        address tokenIn;
        address tokenOut;
        uint24 fee; // e.g., 500, 3000, 10000
        uint256 minOut;
    }

    struct ArbLegV2 {
        address[] path; // e.g., [USDC, WETH]
        uint256 minOut;
    }

    struct ArbParams {
        // which DEX first: true => Uni v3 first, then v2; false => v2 first, then v3
        bool v3First;
        ArbLegV3 v3;
        ArbLegV2 v2;
        uint256 minProfit; // absolute units of asset borrowed
        uint256 deadline;  // unix ts
    }

    // === Admin ===
    function setSplit(uint16 bps) external onlyOwner {
        require(bps <= BPS_DENOM, "bps>100%");
        profitSplitBps = bps;
        emit SplitUpdated(bps);
    }
    function setTreasury(address exodus) external onlyOwner {
        treasury = exodus;
        emit TreasuryUpdated(exodus);
    }
    function rescue(address token, uint256 amt, address to) external onlyOwner {
        IERC20(token).safeTransfer(to, amt);
    }

    // === User Entry ===
    function triggerFlashArb(address asset, uint256 amount, ArbParams calldata ap) external onlyOwner {
        bytes memory data = abi.encode(asset, ap);
        AAVE_POOL.flashLoanSimple(address(this), asset, amount, data, 0);
    }

    // Aave callback
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address /*initiator*/,
        bytes calldata params
    ) external override returns (bool) {
        (address borrowedAsset, ArbParams memory ap) = abi.decode(params, (address, ArbParams));
        require(asset == borrowedAsset, "asset mismatch");
        require(block.timestamp <= ap.deadline, "expired");

        // Approvals for both routers (set once per token pair)
        IERC20(ap.v3.tokenIn).approve(address(UNI_V3_ROUTER), type(uint256).max);
        IERC20(ap.v3.tokenOut).approve(address(UNI_V3_ROUTER), type(uint256).max);
        if (ap.v2.path.length > 0) {
            IERC20(ap.v2.path[0]).approve(address(V2_ROUTER), type(uint256).max);
            IERC20(ap.v2.path[ap.v2.path.length - 1]).approve(address(V2_ROUTER), type(uint256).max);
        }

        uint256 startBal = IERC20(asset).balanceOf(address(this));

        // Execute two legs in chosen order
        if (ap.v3First) {
            _swapV3(ap.v3, amount);
            _swapV2(ap.v2);
        } else {
            _swapV2(ap.v2);
            // Use whatever the current balance of v3.tokenIn is after v2 swap
            uint256 amtIn = IERC20(ap.v3.tokenIn).balanceOf(address(this));
            _swapV3(ap.v3, amtIn);
        }

        uint256 endBal = IERC20(asset).balanceOf(address(this));
        uint256 required = amount + premium;
        require(endBal >= required + ap.minProfit, "insufficient profit");

        // Distribute profit
        uint256 netProfit = endBal - required;
        if (netProfit == 0) revert NoProfit();
        uint256 toTreasury = (netProfit * profitSplitBps) / BPS_DENOM;
        uint256 toCollateral = netProfit - toTreasury;

        if (toTreasury > 0 && treasury != address(0)) IERC20(asset).transfer(treasury, toTreasury);
        // leave toCollateral in contract (visible as retained capital)

        emit Profit(netProfit + premium, premium, netProfit, toTreasury, toCollateral);

        // repay loan
        IERC20(asset).transfer(msg.sender, required);
        return true;
    }

    function _swapV3(ArbLegV3 memory l3, uint256 amountIn) internal returns (uint256 out) {
        if (amountIn == 0) return 0;
        ISwapRouterV3.ExactInputSingleParams memory p = ISwapRouterV3.ExactInputSingleParams({
            tokenIn: l3.tokenIn,
            tokenOut: l3.tokenOut,
            fee: l3.fee,
            recipient: address(this),
            deadline: block.timestamp + 60,
            amountIn: amountIn,
            amountOutMinimum: l3.minOut,
            sqrtPriceLimitX96: 0
        });
        out = UNI_V3_ROUTER.exactInputSingle(p);
    }

    function _swapV2(ArbLegV2 memory l2) internal returns (uint256 out) {
        if (l2.path.length == 0) return 0;
        uint[] memory amts = V2_ROUTER.swapExactTokensForTokens(
            IERC20(l2.path[0]).balanceOf(address(this)),
            l2.minOut,
            l2.path,
            address(this),
            block.timestamp + 60
        );
        out = amts[amts.length - 1];
    }
}
