const AuctionChannel = artifacts.require("AuctionChannel");

const fs = require('fs');

module.exports = class AuctionLogic {

    /**
     * Constructor
     */
    constructor(
        web3
    ) { 
        this.auctionStorage = {};
        this.auctionStorage.bidchain = [];
        this.web3 = web3;
    }

    /**
     * Propose to open auction channel
     * @param params auction params such as auctioneerAddress,
     * assistantAddress, challengePeriod and minBid
     * @return new object containing auction params plus auctioneer's
     * signature for opening channel
     */
    async proposeOpeningChannel (params) {
        const auctioneer = params.auctioneerAddress;
        const assistant = params.assistantAddress;
        const challengePeriod = params.challengePeriod;
        const minBid = params.minBid;

        const fingerprint = this.web3.utils.soliditySha3(
            'openingAuctionChannel',
            auctioneer,
            assistant,
            challengePeriod,
            minBid
        );

        const signatureAuctioneer = await this.signByAuctioneer(fingerprint);

        return {
            auctioneer,
            assistant,
            challengePeriod,
            minBid,
            signatureAuctioneer
        }
    }

    /**
     * Sign the opening channel tx by assistant, post it to the blockchain to open the channel
     * and add genesis bid to the storage
     * @param channel object containing auction params and auctioneer's
     * signature for opening channel
     */
    async acceptOpeningChannel (channel) {
        const fingerprint = this.web3.utils.soliditySha3(
            'openingAuctionChannel',
            channel.auctioneer,
            channel.assistant,
            channel.challengePeriod,
            channel.minBid
        );

        const signatureAssistant = await this.signByAssistant(fingerprint);

        this.auctionChannel = await AuctionChannel.new(
            channel.auctioneer,
            channel.assistant,
            channel.challengePeriod,
            channel.minBid,
            channel.signatureAuctioneer,
            signatureAssistant
        );

        this.auctionStorage.auctioneer = channel.auctioneer;
        this.auctionStorage.assistant = channel.assistant;
        this.auctionStorage.challengePeriod = channel.challengePeriod;
        this.auctionStorage.minBid = channel.minBid;
        this.auctionStorage.contractAddress = this.auctionChannel.address;

        let genesisBid = {
            isAskBid: true,
            userHash:'',
            bidValue: channel.minBid
        }

        this.auctionStorage.bidchain.push(genesisBid);
    }
  
    /**
     * Propose a bid, sign and return
     * @param params bid params such as isAskBid, userHash, bidValue, 
     * @return new object containing auction params and proposal side
     * signature for adding bid
     */
    async proposeBid(params) {
        const isAskBid = params.isAskBid;
        const userHash = params.userHash;
        const bidValue = params.bidValue;

        const lastBid = this.getLastBid();

        if (bidValue < lastBid.bidValue) {
            throw new Error('bidValue is too low')
        }
        
        const fingerprint = this.web3.utils.soliditySha3(
            'auctionBid',
            isAskBid,
            userHash,
            bidValue
        );
    
        let signature0;

        if (isAskBid == true) { 
            signature0 = await this.signByAuctioneer(fingerprint);
        } else {
            signature0 = await this.signByAssistant(fingerprint);
        }
        
        return {
            isAskBid,
            userHash,
            bidValue,
            signature0
        }
    }

    /**
     * Accept a bid, sign and save to storage
     * @param bid object representing bid with proposal side signature
     */
    async acceptBid (bid) {
        const fingerprint = this.web3.utils.soliditySha3(
            'auctionBid',
            bid.isAskBid,
            bid.userHash,
            bid.bidValue
        );

        let signature1;
        if (bid.isAskBid == false) {
            signature1 = await this.signByAuctioneer(fingerprint);
        } else {
            signature1 = await this.signByAssistant(fingerprint);
        }

        bid.signature1 = signature1;
        let lastBid = this.getLastBid();
        bid.previousBidHash = this.calculateBidHash(lastBid);

        this.auctionStorage.bidchain.push(bid);
    }

    // Post bid to the blockchain
    async updateWinnerBid (winnerBid) {
        
        if (winnerBid.isAskBid) {
            throw new Error('AskBid cannot be a winner')
        }
        await this.auctionChannel.updateWinnerBid(
            winnerBid.isAskBid,
            winnerBid.userHash,
            winnerBid.bidValue,
            winnerBid.signature0,
            winnerBid.signature1
        );
    }


    // Start the challenge period, putting channel closing into motion
    async startChallengePeriod() {
        const fingerprint = this.solSha3(
            'startChallengePeriod',
            this.auctionStorage.auctioneer,
            this.auctionStorage.assistant,
            this.auctionStorage.challengePeriod,
            this.auctionStorage.minBid
        );
        
        let signature = await this.signByAssistant(fingerprint);

        await this.auctionChannel.startChallengePeriod(
            signature,
            auctioneerAddress
        )
    }

    // Try to close the channel
    async tryClose () {
        await this.auctionChannel.tryClose();
    }

    // Sign data by assistant
    async signByAssistant(fingerprint) {
        let assistantWallet;
        let path = __dirname + '/../data/keys/assistantWallet.json';
        if (fs.existsSync(path)) {
            assistantWallet = JSON.parse(fs.readFileSync(path, 'utf8'));
        }
        let response = await this.web3.eth.accounts.sign(fingerprint, assistantWallet.privateKey);
        return response.signature;
    }

     // Sign data by auctioneer
    async signByAuctioneer(fingerprint) {
        let auctioneerWallet;
        let path = __dirname +'/../data/keys/auctioneerWallet.json';
        if (fs.existsSync(path)) {
            auctioneerWallet = JSON.parse(fs.readFileSync(path, 'utf8'));
        }
        let response = await this.web3.eth.accounts.sign(fingerprint, auctioneerWallet.privateKey);
        return response.signature;
    }

    // Save auctionStorage obj to the file
    saveStorage() {
        let path = __dirname + '/../data/storage/auctionStorage.json';
        fs.writeFileSync(path, JSON.stringify(this.auctionStorage) , 'utf-8');
    }

    // Calculate hash of the bid
    calculateBidHash(bid) {
        let userHash = bid.userHash;
        let bidValue = bid.bidValue;
        return this.web3.utils.soliditySha3(userHash + bidValue);
    }

    // Get the latest bid from the storage
    getLastBid() {
        let bidchainSize = this.auctionStorage.bidchain.length ;
        return this.auctionStorage.bidchain[bidchainSize-1];
    }

    
}
