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
        bool _isAskBid,
        bytes _userHash,
        uint256 _bidValue,
        bytes _signatureAssistant,
        bytes _signatureAuctioneer
    ) 
        external
    {
        tryClose();

        require(phase != PHASE_CLOSED);

        require(!_isAskBid);
        require(_bidValue > winnerBidValue);
        require(_bidValue >= minBidValue);

        bytes32 _fingerprint = keccak256(
            abi.encodePacked(
                "auctionBid",
                _isAskBid,
                _userHash,
                _bidValue
            )
        );

        _fingerprint = toEthSignedMessageHash(_fingerprint);

        require(auctioneer == recover(_fingerprint, _signatureAuctioneer));
        require(assistant == recover(_fingerprint, _signatureAssistant));
        
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
            abi.encodePacked(
                "startingChallengePeriod",
                auctioneer,
                assistant,
                challengePeriod,
                minBidValue
            )
        );

        _fingerprint = toEthSignedMessageHash(_fingerprint);

        if (_signer == auctioneer) {
            require(auctioneer == recover(_fingerprint, _signature));
        } else if (_signer == assistant) {
            require(assistant == recover(_fingerprint, _signature));
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
