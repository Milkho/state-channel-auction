pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ECRecovery.sol";


/**
 * @title Auction state channel
 */
contract AuctionChannel {
    
    // phase constants
    enum Phase { OPEN, CHALLENGE, CLOSED }

    // current phase
    Phase public phase;

    // auctioneer address
    address public auctioneer;

    // assistant address
    address public assistant;

    // minimum bid value
    uint256 public minBidValue;

    // challenge period in blocks
    uint256 public challengePeriod;

    // closing block number
    uint256 public closingBlock;

    // winner id
    bytes public winnerBidder;

    // winner bid value
    uint256 public winnerBidValue;


    /**
     * CONSTRUCTOR
     *
     * @dev Initialize the AuctionChannel
     * @param _auctioneer auctioneer address
     * @param _assistant assistant address
     * @param _challengePeriod challenge period in blocks
     * @param _minBidValue minimum winner bid value
     * @param _signatureAuctioneer signature of the auctioneer
     * @param _signatureAssistant signature of the assistant
     */ 
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

        _fingerprint = ECRecovery.toEthSignedMessageHash(_fingerprint);

        require(_auctioneer == ECRecovery.recover(_fingerprint, _signatureAuctioneer));
        require(_assistant == ECRecovery.recover(_fingerprint, _signatureAssistant));

        auctioneer = _auctioneer;
        assistant = _assistant;
        challengePeriod = _challengePeriod;
        minBidValue = _minBidValue;
    }
   
    /**
     * @dev Update winner bid
     * @param _isAskBid is it AskBid
     * @param _bidder bidder id
     * @param _bidValue bid value
     * @param _previousBidHash hash of the previous bid
     * @param _signatureAssistant signature of the assistant
     * @param _signatureAuctioneer signature of the auctioneer
     */
    function updateWinnerBid(
        bool _isAskBid,
        bytes _bidder,
        uint256 _bidValue,
        bytes _previousBidHash,
        bytes _signatureAssistant,
        bytes _signatureAuctioneer
    ) 
        external
    {
        tryClose();

        require(phase != Phase.CLOSED);

        require(!_isAskBid);
        require(_bidValue > winnerBidValue);
        require(_bidValue >= minBidValue);

        bytes32 _fingerprint = keccak256(
            abi.encodePacked(
                "auctionBid",
                _isAskBid,
                _bidder,
                _bidValue,
                _previousBidHash
            )
        );

        _fingerprint = ECRecovery.toEthSignedMessageHash(_fingerprint);

        require(auctioneer == ECRecovery.recover(_fingerprint, _signatureAuctioneer));
        require(assistant == ECRecovery.recover(_fingerprint, _signatureAssistant));
        
        winnerBidder = _bidder;
        winnerBidValue = _bidValue;

        // start challenge period
        closingBlock = block.number + challengePeriod;
        phase = Phase.CHALLENGE;  
    }

    /**
     * @dev Close the auction
     */
    function tryClose() public {
        if (phase == Phase.CHALLENGE && block.number > closingBlock) {
            phase = Phase.CLOSED;
        }
    }

}
