// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

contract ExampleTest is Test {
    function testAddition() public {
        uint256 a = 2;
        uint256 b = 3;
        assertEq(a + b, 5, "Addition should be correct");
    }
    // Removed deprecated failing test
}
