const AuctionChannel = artifacts.require("AuctionChannel");

const fs = require('fs');
const Web3 = require('web3');

export class AuctionLogic {

    /**
     * Constructor
     */
    constructor(
    ) { 
        this.auctionStorage = {};
        this.auctionStorage.bidchain = [];
        this.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
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

        let auctioneerWallet;

        if (fs.existsSync('./data/keys/auctioneerWallet.json')) {
            auctioneerWallet = JSON.parse(fs.readFileSync('./data/keys/auctioneerWallet.json', 'utf8'));
        }
        const signatureAuctioneer = await this.web3.eth.accounts.sign(fingerprint, auctioneerWallet.privateKey);

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
            auctioneer,
            assistant,
            challengePeriod
        );

        let assistantWallet;
        if (fs.existsSync('./data/keys/auctioneerWallet.json')) {
            assistantWallet = JSON.parse(fs.readFileSync('./data/keys/auctioneerWallet.json', 'utf8'));
        }
        const signatureAssistant = await this.web3.eth.accounts.sign(fingerprint, assistantWallet.privateKey);

        this.auctionChannel = await AuctionChannel.new(
            channel.auctioneer,
            channel.assistant,
            channel.challengePeriod,
            channel.minBid,
            channel.signatureAuctioneer,
            signatureAssistant
        );

        let genesisBid;
        genesisBid.isAskBid = true;
        genesisBid.bidValue = channel.minBid;

        this.auctionStorage.auctioneer = channel.auctioneer;
        this.auctionStorage.assistant = channel.assistant;
        this.auctionStorage.challengePeriod = channel.challengePeriod;
        this.auctionStorage.minBid = channel.minBid;

        this.auctionStorage.bidchain.push(genesisBid);
    }
  
    /**
     * Propose a bid, sign and return
     * @param params bid params such as isAskBid, userHash, bidValue, 
     * @return new object containing auction params and proposal side
     * signature for adding bid
     */
    async proposeBid(params) {
        const isAskBid = params.auctioneerAddress;
        const userHash = params.assistantAddress;
        const bidValue = params.challengePeriod;

        const lastBid = getLastBid();

        if (bidValue < lastBid.bidValue) {
            throw new Error('bidValue is too low')
        }
        
        const fingerprint = this.web3.utils.soliditySha3(
            'auctionBid',
            userHash,
            bidValue
        );
    
        let signature0;
        if (isAskBid == true) {
            let auctioneerWallet;
    
            if (fs.existsSync('../data/keys/auctioneerWallet.json')) {
                auctioneerWallet = JSON.parse(fs.readFileSync('../data/keys/auctioneerWallet.json', 'utf8'));
            }
            signature0 = await this.web3.eth.accounts.sign(fingerprint, auctioneerWallet.privateKey);
        } else {
            let assistantWallet;
            if (fs.existsSync('../data/keys/assistantWallet.json')) {
                assistantWallet = JSON.parse(fs.readFileSync('../data/keys/assistantWallet.json', 'utf8'));
            }
            signature0 = await this.web3.eth.accounts.sign(fingerprint, assistantWallet.privateKey);
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
            bid.userHash,
            bid.bidValue
        );

        let signature1;
        if (isAskBid == false) {
            let auctioneerWallet;
    
            if (fs.existsSync('../data/keys/auctioneerWallet.json')) {
                auctioneerWallet = JSON.parse(fs.readFileSync('../data/keys/auctioneerWallet.json', 'utf8'));
            }
            signature1 = await this.web3.eth.accounts.sign(fingerprint, auctioneerWallet.privateKey);
        } else {
            let assistantWallet;
            if (fs.existsSync('../data/keys/assistantWallet.json')) {
                assistantWallet = JSON.parse(fs.readFileSync('../data/keys/assistantWallet.json', 'utf8'));
            }
            signature1 = await this.web3.eth.accounts.sign(fingerprint, assistantWallet.privateKey);
        }

        bid.signature1 = signature1;

        let lastBid = getLastBid();
        bid.previousBidHash = calculateBidHash(lastBid);

        this.auctionStorage.bidchain.push(bid);
    }

    // Post bid to the blockchain
    async updateWinnerBid (winnerBid) {
        await AuctionChannel.updateWinnerBid(
            winnerBid.userHash,
            winnerBid.bidValue,
            winnerBid.previousBidHash,
            winnerBid.signature0,
            winnerBid.signature1
        );
    }


    // Start the challenge period, putting channel closing into motion
    async startChallengePeriod() {
        const fingerprint = this.solSha3(
            'startChallengePeriod'
          );
      
        let assistantWallet;
        if (fs.existsSync('../data/keys/assistantWallet.json')) {
            assistantWallet = JSON.parse(fs.readFileSync('../data/keys/assistantWallet.json', 'utf8'));
        }
        let signature = await this.web3.eth.accounts.sign(fingerprint, assistantWallet.privateKey);

        await AuctionChannel.startChallengePeriod(
            signature,
            auctioneerAddress
        )
    }


    // Try to close the channel
    async tryClose () {
        await this.auctionContract.tryClose();
    }

    // Save auctionStorage obj to the file
    saveStorage() {
        fs.writeFileSync('../data/storage/auctionStorage.json', this.auctionStorage.join(',') , 'utf-8');
    }

    // Calculate hash of the bid
    calculateBidHash(bid) {
        let userHash = bid.userHash;
        let bidValue = bid.bidValue;
        return this.web3.utils.soliditySha3(userHash + bidValue);
    }

    // Get the latest bid from the storage
    getLastBid() {
        return auctionStorage.bidchain[auctionStorage.bidchain.size - 1];
    }
}
