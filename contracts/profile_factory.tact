import "@stdlib/ownable";
import "./profile.tact";
import "./message";

contract ProfileFactory with Ownable {
    override const storageReserve: Int = minTonsForStorage;

    next_item_index: Int as uint32 = 0;
    owner: Address;
    collection_content: Cell;   
    cost: Int as coins = ton("10000");

    init(owner: Address){
        self.owner = owner;
        self.collection_content = emptyCell();
    }

    receive(msg: UpdateProfileFactory) {
        self.requireOwner();
        require(msg.cost > 0, "cost must be positive");
        require(msg.content != emptyCell(), "content must be not empty");
        self.collection_content = msg.content;
        self.cost = msg.cost;

        self.notify("Profile Factory Successfully Updated".asComment());
    }

    receive("Withdraw") {
        self.requireOwner();
        nativeReserve(minTonsForStorage + gasConsumption, ReserveExact);
        send(SendParameters{
                to: self.owner,
                value: 0,
                mode: SendRemainingBalance,
                bounce: false,
                body: "Withdraw completed".asComment()
        });
    }

    receive(msg: ProfileIssue){
        let ctx: Context = context();
        require(ctx.value >= self.cost, "No enough funds to enroll");
        let nft_init: StateInit = self.getCertificateInit(self.next_item_index);
        send(SendParameters{
                to: contractAddress(nft_init), 
                value: minTonsForStorage, 
                bounce: false,
                mode: SendPayGasSeparately | SendIgnoreErrors,
                body: Transfer {
                    query_id: 0,
                    new_owner: sender(),
                    response_destination: myAddress(),
                    custom_payload: msg.profile_content,
                    forward_amount: 0,
                    forward_payload: emptySlice()
                }.toCell(),
                code: nft_init.code,
                data: nft_init.data
            });

        // dump(self.next_item_index); // Reference at: https://tact-by-example.org/03-emit
        self.next_item_index = self.next_item_index + 1;
    }

    // ===== Private Methods ===== //
    fun getCertificateInit(item_index: Int): StateInit {
        return initOf Profile(myAddress(), item_index);
    }


    // ------------------ Get Function  ------------------ //
    get fun get_collection_data(): CollectionData {     
        return CollectionData{
            next_item_index: self.next_item_index, 
            collection_content: self.collection_content, 
            owner_address: self.owner
        };
    }

    get fun get_profile_factory_data(): ProfileFactoryData {     
        return ProfileFactoryData{
            next_item_index: self.next_item_index, 
            collection_content: self.collection_content, 
            cost: self.cost,
            owner_address: self.owner
        };
    }

    get fun get_nft_address_by_index(item_index: Int): Address?{      
        let initCode: StateInit = self.getCertificateInit(item_index);
        return contractAddress(initCode);
    }
    
    get fun get_nft_content(index: Int, individual_content: Cell): Cell { 
        return individual_content;
    }

    get fun get_balance(): Int {
        return myBalance();
    }
}
