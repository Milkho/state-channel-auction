const AuctionChannel = artifacts.require('AuctionChannel');

const Web3 = require('web3');
const AuctionLogic = require('../src/auctionLogic');

contract('Auction Logic', ([auctioneer, assistant]) => {

    const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

    this.minBidValue = 10000000;
    this.challengePeriod = 100;
    

    it('should open the auction', async () => {
        const fingerprint = web3.utils.soliditySha3(
            "openingAuctionChannel",
            auctioneer,
            assistant,
            this.challengePeriod,
            this.minBidValue
        );
        
        const responseAuctioneer = await web3.eth.accounts.sign(fingerprint, "0xe098d7adee1b05c9fabe042c4b2144995bb73ae2a33357b8cd374160542d7193");
        const responseAssistant = await web3.eth.accounts.sign(fingerprint, "0xf2f27021ecab3fe1d4cc0dc1b2c42bb2fb0b3a5f067bae57a283ccd2c98009d0");

        this.auction = await AuctionChannel.new(
            auctioneer,
            assistant,
            this.challengePeriod,
            this.minBidValue,
            responseAuctioneer.signature,
            responseAssistant.signature
        );

        this.auctionLogic = new AuctionLogic(web3, this.auction);
    });
    
    it('should receive genesis bid', async () => {
        const genesisBid = {
            isAskBid: true,
            user: '',
            bidValue: 2340328,
            previousBidHash: "fdhdfg"
        }
        const bid = await this.auctionLogic.proposeBid(genesisBid);
        await this.auctionLogic.acceptBid(bid);
            
    });

    it('should receive bids', async () => {
        const params = {
            isAskBid: false,
            user: 'jskfjdkgjkf',
            bidValue: 20000000,
            previousBidHash: "fdhdfg"
        }
        const bid = await this.auctionLogic.proposeBid(params);
        await this.auctionLogic.acceptBid(bid);
            
    });

    it('should post winner bid to blockchain', async () => {
        const bid = this.auctionLogic.getLastBid();
        await this.auctionLogic.updateWinnerBid(bid); 
    });

    it('should start challenge period', async () => {
        this.auctionLogic.startChallengePeriod();

        this.auctionLogic.saveStorage();     
    });

    it('should close the auction', async () => {
        await this.auctionLogic.tryClose(); 
    });
});