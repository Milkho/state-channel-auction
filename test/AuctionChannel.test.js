const AuctionChannel = artifacts.require('AuctionChannel');

const web3Utils = require('web3-utils');
const Web3 = require('web3');

contract('Auction Channel', ([auctioneer, assistant]) => {

    this.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

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
        
        const signatureAuctioneer = await this.web3.eth.sign(fingerprint, auctioneer);
        const signatureAssistant = await this.web3.eth.sign(fingerprint, assistant);

        this.auction = await AuctionChannel.new(
            auctioneer,
            assistant,
            this.challengePeriod,
            this.minBidValue,
            signatureAuctioneer,
            signatureAssistant
        );
               
    });
  

    it('should update winner bid', async () => {
        const userHash = "user123ds";
        const bidValue = 20000000;
        const previousBidHash = "fdsgfd";

        const fingerprint = web3Utils.soliditySha3(
            'auctionBid',
            userHash,
            bidValue,
            previousBidHash
        );

        const signatureAuctioneer = await this.web3.eth.sign(fingerprint, auctioneer);
        const signatureAssistant = await this.web3.eth.sign(fingerprint, assistant);

        await this.auction.updateWinnerBid(
            userHash,
            bidValue,
            previousBidHash,
            signatureAssistant,
            signatureAuctioneer
        );

        const winnerUserHash = await this.auction.winnerUserHash.call();
        const winnerBidValue = await this.auction.winnerBidValue.call();

        assert.equal(winnerUserHash, web3.fromUtf8(userHash));
        assert.equal(winnerBidValue.toNumber(), bidValue);        
    });

});