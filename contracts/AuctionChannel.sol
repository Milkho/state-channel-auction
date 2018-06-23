pragma solidity ^0.4.24;

import "./ECRecovery.sol"; 

contract AuctionChannel is ECRecovery {
    uint8 public constant PHASE_OPEN = 0;
    uint8 public constant PHASE_CHALLENGE = 1;
    uint8 public constant PHASE_CLOSED = 2;
    
    address public auctioneer;
    address public assistant;
    uint8 public phase;

    uint256 public minBidValue;

    uint256 public challengePeriod;
    uint256 public closingBlock;

    bytes public winnerUserHash;
    uint256 public winnerBidValue;

    event Error (address msg);

    constructor
    (
        address _auctioneer,
        address _assistant,
        uint256 _challengePeriod,
        uint256 _minBidValue,
        bytes _signatureAuctioneer,
        bytes _signatureAssistant
    )
        public
    {
        bytes32 _fingerprint = keccak256(
            abi.encodePacked(
                "openingAuctionChannel",
                _auctioneer,
                _assistant,
                _challengePeriod,
                _minBidValue
            )
        );

        _fingerprint = toEthSignedMessageHash(_fingerprint);

        require(_auctioneer == recover(_fingerprint, _signatureAuctioneer));
        require(_assistant == recover(_fingerprint, _signatureAssistant));

        auctioneer = _auctioneer;
        assistant = _assistant;
        challengePeriod = _challengePeriod;
        minBidValue = _minBidValue;
    }
   
    function updateWinnerBid(
        bytes _userHash,
        uint256 _bidValue,
        bytes _previousAskBidHash,
        bytes _signatureAssistant,
        bytes _signatureAuctioneer
    ) 
        external
    {
        tryClose();

        require(phase != PHASE_CLOSED);

        bytes32 _fingerprint = keccak256(
            abi.encodePacked(
                "updatingAuctionWinner",
                _userHash,
                _bidValue,
                _previousAskBidHash
            )
        );

        _fingerprint = toEthSignedMessageHash(_fingerprint);

        // require(auctioneer == ECRecovery.recover(_fingerprint, _signatureAuctioneer));
        // require(assistant == ECRecovery.recover(_fingerprint, _signatureAssistant));
        // require(_bidValue > winnerBidValue);
        // require(_bidValue >= minBidValue);

        winnerUserHash = _userHash;
        winnerBidValue = _bidValue;
    }

    function startChallengePeriod(
        bytes _signature,
        address _signer
    )
        external
    {
        require (phase == PHASE_OPEN);

        bytes32 _fingerprint = keccak256(
            "startingChallengePeriod"
        );

        _fingerprint = toEthSignedMessageHash(_fingerprint);

        if (_signer == auctioneer) {
            require(auctioneer == ECRecovery.recover(_fingerprint, _signature));
        } else if (_signer == assistant) {
            require(assistant == ECRecovery.recover(_fingerprint, _signature));
        } else {
            return;
        }

        closingBlock = block.number + challengePeriod;
        phase = PHASE_CHALLENGE;
    }

    function tryClose() public {
        if (phase == PHASE_CHALLENGE && block.number > closingBlock) {
            phase = PHASE_CLOSED;
        }
    }

}
