const AuctionChannel = artifacts.require('AuctionChannel');

const assertRevert = require('./helpers/assertRevert');
const Web3 = require('web3');


contract('Auction Channel', ([auctioneer, assistant]) => {

    this.web3 = new Web3(Web3.currentProvider);

    this.minBidValue = 10000000;
    this.challengePeriod = 1;
    

    it('should create auction', async () => {
        const fingerprint = this.web3.utils.soliditySha3(
            "openingAuctionChannel",
            auctioneer,
            assistant,
            this.challengePeriod,
            this.minBidValue
        );
        
        const responseAuctioneer = await this.web3.eth.accounts.sign(fingerprint, "0xe098d7adee1b05c9fabe042c4b2144995bb73ae2a33357b8cd374160542d7193");
        const responseAssistant = await this.web3.eth.accounts.sign(fingerprint, "0xf2f27021ecab3fe1d4cc0dc1b2c42bb2fb0b3a5f067bae57a283ccd2c98009d0");

        this.auction = await AuctionChannel.new(
            auctioneer,
            assistant,
            this.challengePeriod,
            this.minBidValue,
            responseAuctioneer.signature,
            responseAssistant.signature
        );
               
    });
  

    it('should start winner bid', async () => {
        const bidder = "bidder123ds";
        const bidValue = 20000000;
        const previousBidHash = "fdsgfd";

        const fingerprint = this.web3.utils.soliditySha3(
            'auctionBid',
            false,
            bidder,
            bidValue,
            previousBidHash
        );

        const responseAuctioneer = await this.web3.eth.accounts.sign(fingerprint, "0xe098d7adee1b05c9fabe042c4b2144995bb73ae2a33357b8cd374160542d7193");
        const responseAssistant = await this.web3.eth.accounts.sign(fingerprint, "0xf2f27021ecab3fe1d4cc0dc1b2c42bb2fb0b3a5f067bae57a283ccd2c98009d0");

        await this.auction.updateWinnerBid(
            false,
            bidder,
            bidValue,
            previousBidHash,
            responseAssistant.signature,
            responseAuctioneer.signature
        );

        const winnerBidder = await this.auction.winnerBidder.call();
        const winnerBidValue = await this.auction.winnerBidValue.call();

        assert.equal(winnerBidder, web3.fromUtf8(bidder));
        assert.equal(winnerBidValue.toNumber(), bidValue);        
    });

    it('should update winner bid with higher bid', async () => {
        const bidder = "bidder123ds";
        const bidValue = 286000000;
        const previousBidHash = "fdsgfd";

        const fingerprint = this.web3.utils.soliditySha3(
            'auctionBid',
            false,
            bidder,
            bidValue,
            previousBidHash
        );

        const responseAuctioneer = await this.web3.eth.accounts.sign(fingerprint, "0xe098d7adee1b05c9fabe042c4b2144995bb73ae2a33357b8cd374160542d7193");
        const responseAssistant = await this.web3.eth.accounts.sign(fingerprint, "0xf2f27021ecab3fe1d4cc0dc1b2c42bb2fb0b3a5f067bae57a283ccd2c98009d0");

        await this.auction.updateWinnerBid(
            false,
            bidder,
            bidValue,
            previousBidHash,
            responseAssistant.signature,
            responseAuctioneer.signature
        );

        const winnerBidder = await this.auction.winnerBidder.call();
        const winnerBidValue = await this.auction.winnerBidValue.call();

        assert.equal(winnerBidder, web3.fromUtf8(bidder));
        assert.equal(winnerBidValue.toNumber(), bidValue);        
    });

    it('should not update winner bid with lower bid', async () => {
        const bidder = "bidder123ds";
        const bidValue = 26000000;
        const previousBidHash = "fdsgfd";

        const fingerprint = this.web3.utils.soliditySha3(
            'auctionBid',
            false,
            bidder,
            bidValue,
            previousBidHash
        );

        const responseAuctioneer = await this.web3.eth.accounts.sign(fingerprint, "0xe098d7adee1b05c9fabe042c4b2144995bb73ae2a33357b8cd374160542d7193");
        const responseAssistant = await this.web3.eth.accounts.sign(fingerprint, "0xf2f27021ecab3fe1d4cc0dc1b2c42bb2fb0b3a5f067bae57a283ccd2c98009d0");

        await assertRevert(
            this.auction.updateWinnerBid(
                false,
                bidder,
                bidValue,
                previousBidHash,
                responseAssistant.signature,
                responseAuctioneer.signature
            )
        );     
    });

    it('should start challenge period', async () => {
        const PHASE_CHALLENGE = 1;
        let phase = await this.auction.phase.call();
        
        assert.equal(phase.toNumber(), PHASE_CHALLENGE);
    });

    it('should close auction', async () => {
        const PHASE_CLOSE = 2;
        await this.auction.tryClose();
        let phase = await this.auction.phase.call();
        assert.equal(phase.toNumber(), PHASE_CLOSE);
    });
});