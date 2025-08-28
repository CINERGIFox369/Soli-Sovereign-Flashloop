// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

interface IExe {
}

import "../contracts/FlashLoopExecutor.sol";

contract DeployFlashLoop is Script {
    function run() external {
        address AAVE_POOL;
        address UNI_V3;
        address V2_ROUTER;
        address TREASURY = vm.envAddress("TREASURY");
        string memory CHAIN = vm.envString("CHAIN"); // "arbitrum" | "polygon"

        if (keccak256(bytes(CHAIN)) == keccak256("arbitrum")) {
                AAVE_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
                UNI_V3    = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
                V2_ROUTER = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506; // Sushi
        } else if (keccak256(bytes(CHAIN)) == keccak256("polygon")) {
            AAVE_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
            UNI_V3    = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
            V2_ROUTER = 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff; // QuickSwap
        } else {
            revert("unsupported CHAIN");
        }

        vm.startBroadcast();
        FlashLoopExecutor exe = new FlashLoopExecutor(AAVE_POOL, UNI_V3, V2_ROUTER, TREASURY);
        vm.stopBroadcast();

        console2.log("FlashLoopExecutor:", address(exe));
    }
}
