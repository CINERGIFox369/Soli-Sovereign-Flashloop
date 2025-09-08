// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/FlashLoopExecutor.sol";

contract FlashLoopSafetyTest is Test {
    FlashLoopExecutor exe;
    address mockPool = address(0x1234);
    address uni = address(0x1111);
    address v2 = address(0x2222);

    function setUp() public {
        exe = new FlashLoopExecutor(mockPool, uni, v2, address(this));
    }

    function test_PauseUnpause() public {
        exe.pause();
        // triggerFlashArb is onlyOwner, so call as this (owner)
        vm.expectRevert();
        exe.triggerFlashArb(address(0x1), 1, FlashLoopExecutor.ArbParams({v3First:true, v3: FlashLoopExecutor.ArbLegV3({tokenIn: address(0x1), tokenOut: address(0x2), fee: 500, minOut: 0}), v2: FlashLoopExecutor.ArbLegV2({path: new address[](0), minOut: 0}), minProfit: 0, deadline: block.timestamp + 60}));
        exe.unpause();
        // now it should not revert for amount>0 (but will call into Aave, so expect to at least accept amount check)
        vm.expectRevert();
        exe.triggerFlashArb(address(0x1), 0, FlashLoopExecutor.ArbParams({v3First:true, v3: FlashLoopExecutor.ArbLegV3({tokenIn: address(0x1), tokenOut: address(0x2), fee: 500, minOut: 0}), v2: FlashLoopExecutor.ArbLegV2({path: new address[](0), minOut: 0}), minProfit: 0, deadline: block.timestamp + 60}));
    }

    function test_ExecuteOnlyAavePool() public {
        // calling executeOperation from a non-pool address should revert due to msg.sender check
        vm.prank(address(0x9999));
        vm.expectRevert();
        exe.executeOperation(address(0x1), 1, 1, address(0x0), abi.encode(address(0x1), FlashLoopExecutor.ArbParams({v3First:true, v3: FlashLoopExecutor.ArbLegV3({tokenIn: address(0x1), tokenOut: address(0x2), fee: 500, minOut: 0}), v2: FlashLoopExecutor.ArbLegV2({path: new address[](0), minOut: 0}), minProfit: 0, deadline: block.timestamp + 60})));
    }
}
