// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AppHub - Unified contract for Faucet + Transfer + SA tracking
contract AppHub {
    address public owner;

    // Danh sách token được phép faucet và số lượng mỗi lần claim
    struct FaucetToken {
        bool enabled;
        uint256 amount;
    }
    mapping(address => FaucetToken) public faucetTokens;
    mapping(address => mapping(address => bool)) public userClaimed; 
    // userClaimed[user][token] = true nếu đã claim

    // ===================== EVENTS =====================
    event FaucetTokenAdded(address indexed token, uint256 amount);
    event FaucetClaimed(address indexed user, address indexed token, uint256 amount, uint256 timestamp);
    event TransferExecuted(address indexed user, address indexed token, address indexed to, uint256 amount, uint256 timestamp);
    event AccountDeployed(address indexed user, address smartAccount, uint256 timestamp);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ===================== ADMIN SETUP =====================

    /// @notice add ERC20 token for faucet
    function addFaucetToken(address token, uint256 amount) external onlyOwner {
        faucetTokens[token] = FaucetToken(true, amount);
        emit FaucetTokenAdded(token, amount);
    }

    /// @notice withdraw ERC20 back to owner
    function withdrawToken(address token) external onlyOwner {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        require(success);
        uint256 bal = abi.decode(data, (uint256));
        (bool sent, ) = token.call(abi.encodeWithSignature("transfer(address,uint256)", owner, bal));
        require(sent, "Withdraw failed");
    }

    // ===================== FAUCET FUNCTION =====================

    /// @notice user claim ERC20 faucet once per token
    function faucet(address token) external {
        FaucetToken memory f = faucetTokens[token];
        require(f.enabled, "Token faucet disabled");
        require(!userClaimed[msg.sender][token], "Already claimed");

        userClaimed[msg.sender][token] = true;
        (bool success, ) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", msg.sender, f.amount)
        );
        require(success, "Faucet transfer failed");

        emit FaucetClaimed(msg.sender, token, f.amount, block.timestamp);
    }

    // ===================== TRANSFER =====================
    function transferToken(address token, address to, uint256 amount) external {
        (bool success, ) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, to, amount)
        );
        require(success, "Transfer failed");
        emit TransferExecuted(msg.sender, token, to, amount, block.timestamp);
    }

    // ===================== SA Tracking =====================
    function emitAccountDeployed(address sa) external {
        emit AccountDeployed(msg.sender, sa, block.timestamp);
    }
}
