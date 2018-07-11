const AuctionChannel = artifacts.require('AuctionChannel');

const Web3 = require('web3');
const AuctionLogic = require('../src/auctionLogic');

contract('Auction Logic', (accounts) => {

    const web3 = new Web3(Web3.currentProvider);
    const auctioneer = "0xf823f0F90a1f351Ae04724247e096A2D95F3908F";
    const assistant = "0x08480524f01A797596eF32dee86A01b80BF4A9DA";
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
        
        const responseAuctioneer = await web3.eth.accounts.sign(fingerprint, "0x630f38905e0b91fcf3cffac1b3c4917ec84669d36c2e5559c2b4e32d81cde979");
        const responseAssistant = await web3.eth.accounts.sign(fingerprint, "0x420ac85383fb5133c21c8150d8f9d6d926ea7a983db37f1ee113c88895efb33e");

        this.auction = await AuctionChannel.new(
            auctioneer,
            assistant,
            this.challengePeriod,
            this.minBidValue,
            responseAuctioneer.signature,
            responseAssistant.signature
        );

        this.auctionLogic = new AuctionLogic(web3, this.auction);
        await this.auctionLogic.init();
    });
    
    it('should receive genesis bid', async () => {
        const genesisBid = {
            isAskBid: true,
            bidder: '',
            bidValue: 2340328,
            previousBidHash: "fdhdfg"
        }
        const bid = await this.auctionLogic.proposeBid(genesisBid);
        await this.auctionLogic.acceptBid(bid);
            
    });

    it('should receive bids', async () => {
        const params = {
            isAskBid: false,
            bidder: 'jskfjdkgjkf',
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


    it('should close the auction', async () => {
        await this.auctionLogic.tryClose(); 
        this.auctionLogic.saveStorage();
    });
});