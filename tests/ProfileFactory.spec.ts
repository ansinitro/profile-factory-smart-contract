import { Blockchain, SandboxContract, TreasuryContract, EventMessageSent } from '@ton/sandbox';
import { Address, beginCell, toNano, fromNano } from '@ton/core';
import { ProfileFactory } from '../wrappers/ProfileFactory';
import { Profile } from '../wrappers/Profile';
import '@ton/test-utils';
import { Cell } from 'ton';

// const ANSI_ADDRESS = "0QC4hAk6Xhs4UY3dPZ3o0UbR5dnV4EeO-6I0dp13fYcsjAxo";
// Fee with deploy =  0.0260544
// Fee without deploy =  0.0057228
// Fee for deploy (approximately) =  0.0203316

const PROFILE_FACTORY_DATA = {
    content: beginCell().storeStringTail("fdjhskaf").endCell(),
    cost: toNano('5')
};
const TON_COINS = {
    initialProfileFactoryCost: toNano("10000"),
    minTonsForStorage: toNano("0.02"),
    gasConsumption: toNano("0.03"),
    tollerance: toNano("0.01")
}

describe('ProfileFactory Creation', () => {
    let blockchain: Blockchain;
    let educator: SandboxContract<TreasuryContract>;
    let profileFactory: SandboxContract<ProfileFactory>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        educator = await blockchain.treasury('educator');
    });

    it('educator create profileFactory', async () => {
        profileFactory = blockchain.openContract(await ProfileFactory.fromInit(educator.address));
        const deployResult = await profileFactory.send(
            educator.getSender(),
            { value: TON_COINS.minTonsForStorage + TON_COINS.gasConsumption },
            {
                $$type: 'UpdateProfileFactory',
                content: PROFILE_FACTORY_DATA.content,
                cost: PROFILE_FACTORY_DATA.cost,
            }
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: educator.address,
            to: profileFactory.address,
            deploy: true,
            success: true
        });
        expect((await profileFactory.getGetCollectionData()).owner_address.toString()).toEqual(educator.address.toString());
    });

    it('educator deploy profileFactory for ansi', async () => {
        const ansiAddress = Address.parse('0QC4hAk6Xhs4UY3dPZ3o0UbR5dnV4EeO-6I0dp13fYcsjAxo');
        profileFactory = blockchain.openContract(await ProfileFactory.fromInit(ansiAddress));
        const educatorBalanceBefore = await educator.getBalance();
        const deployResult = await profileFactory.send(
            educator.getSender(),
            { value: TON_COINS.minTonsForStorage + TON_COINS.gasConsumption },
            {
                $$type: 'UpdateProfileFactory',
                content: PROFILE_FACTORY_DATA.content,
                cost: PROFILE_FACTORY_DATA.cost,
            }
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: educator.address,
            to: profileFactory.address,
            deploy: true,
            success: false
        });
        expect((await profileFactory.getGetProfileFactoryData()).cost).toEqual(TON_COINS.initialProfileFactoryCost);
        expect((await profileFactory.getGetCollectionData()).owner_address.toString()).toEqual(ansiAddress.toString());
        expect((await profileFactory.getGetBalance())).toEqual(0n);
        expect((await educator.getBalance())).
            toBeGreaterThan(educatorBalanceBefore - TON_COINS.gasConsumption);
    });

    it('create profileFactory with `ton less` than `minimal ton for storage`', async () => {
        const value = toNano('0.01');
        expect(value).toBeLessThan(TON_COINS.minTonsForStorage);
        const profileFactoryWithId1 = blockchain.openContract(await ProfileFactory.fromInit(educator.address));
        const deployResult = await profileFactoryWithId1.send(
            educator.getSender(),
            {
                value: value,
            },
            {
                $$type: 'UpdateProfileFactory',
                content: PROFILE_FACTORY_DATA.content,
                cost: PROFILE_FACTORY_DATA.cost,
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: educator.address,
            to: profileFactoryWithId1.address,
            deploy: true,
            success: false,
        });
    });

    it('create profileFactory and send a lot of ton (ton should returned)', async () => {
        profileFactory = blockchain.openContract(await ProfileFactory.fromInit(educator.address));
        const educatorBalanceBefore = await educator.getBalance();
        const deployResult = await profileFactory.send(
            educator.getSender(),
            { value: toNano("50000") }, // 50 000 TON
            {
                $$type: 'UpdateProfileFactory',
                content: PROFILE_FACTORY_DATA.content,
                cost: PROFILE_FACTORY_DATA.cost,
            }
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: educator.address,
            to: profileFactory.address,
            deploy: true,
            success: true,
        });

        expect((await profileFactory.getGetBalance())).toEqual(TON_COINS.minTonsForStorage);
        expect((await educator.getBalance())).
            toBeGreaterThan(educatorBalanceBefore - TON_COINS.gasConsumption - TON_COINS.minTonsForStorage);
    })
});

describe('ProfileFactory general', () => {
    let blockchain: Blockchain;
    let educator: SandboxContract<TreasuryContract>;
    let profileFactory: SandboxContract<ProfileFactory>;
    const ansiAddress = Address.parse('0QC4hAk6Xhs4UY3dPZ3o0UbR5dnV4EeO-6I0dp13fYcsjAxo');

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        educator = await blockchain.treasury('educator');
        profileFactory = blockchain.openContract(await ProfileFactory.fromInit(ansiAddress));

        await profileFactory.send(
            educator.getSender(),
            {
                value: TON_COINS.minTonsForStorage + TON_COINS.gasConsumption,
            },
            {
                $$type: 'UpdateProfileFactory',
                content: PROFILE_FACTORY_DATA.content,
                cost: PROFILE_FACTORY_DATA.cost,
            }
        );
    });

    it('check all init data', async () => {
        const initNextItemIndex = 0n;
        const initCollectionContent = new Cell(); // empty cell
        const initOwnerAddress = ansiAddress.toString();

        const profileFactoryData = await profileFactory.getGetProfileFactoryData();
        expect(profileFactoryData.next_item_index).toEqual(initNextItemIndex);
        expect(profileFactoryData.collection_content.toString()).toEqual(initCollectionContent.toString());
        expect(profileFactoryData.owner_address.toString())
            .toEqual(ansiAddress.toString());
        expect(profileFactoryData.cost).toEqual(TON_COINS.initialProfileFactoryCost);
    });

    it('check different `id` in init data give different addresses', async () => {
        const id1 = 1n;
        const profileFactoryWithId1 = blockchain.openContract(await ProfileFactory.fromInit(educator.address));
        expect(profileFactoryWithId1.address.equals(profileFactory.address)).toBe(false);
    });
});

describe('ProfileFactory UpdateProfileFactory', () => {
    let blockchain: Blockchain;
    let educator: SandboxContract<TreasuryContract>;
    let profileFactory: SandboxContract<ProfileFactory>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        educator = await blockchain.treasury('educator');
        profileFactory = blockchain.openContract(await ProfileFactory.fromInit(educator.address));

        await profileFactory.send(
            educator.getSender(),
            {
                value: TON_COINS.minTonsForStorage + TON_COINS.gasConsumption,
            },
            {
                $$type: 'UpdateProfileFactory',
                content: PROFILE_FACTORY_DATA.content,
                cost: PROFILE_FACTORY_DATA.cost,
            }
        );
    });

    it('owner set cost', async () => {
        const educatorBalanceBefore = await educator.getBalance();
        const newCost = toNano('100');
        const setCostResult = await profileFactory.send(
            educator.getSender(),
            {
                value: toNano("500"),
            },
            {
                $$type: 'UpdateProfileFactory',
                content: PROFILE_FACTORY_DATA.content,
                cost: newCost,
            }
        );
        expect(setCostResult.transactions).toHaveTransaction({
            from: educator.address,
            to: profileFactory.address,
            success: true,
        });
        expect((await profileFactory.getGetProfileFactoryData()).cost).toEqual(newCost);
        expect(await educator.getBalance()).toBeGreaterThan(educatorBalanceBefore - TON_COINS.gasConsumption);
    });

    it('not owner set cost', async () => {
        const notOwner = await blockchain.treasury('notowner');
        const notOwnerSetCost = toNano("1");
        const setCostResult = await profileFactory.send(
            notOwner.getSender(),
            {
                value: toNano("0.01"),
            },
            {
                $$type: 'UpdateProfileFactory',
                content: PROFILE_FACTORY_DATA.content,
                cost: notOwnerSetCost,
            }
        );

        expect(setCostResult.transactions).toHaveTransaction({
            from: notOwner.address,
            to: profileFactory.address,
            success: false,
        });
        expect((await profileFactory.getGetProfileFactoryData()).cost).toEqual(PROFILE_FACTORY_DATA.cost);
    });

    it('owner set cost less 0', async () => {
        // we can't check it because the `cost` is `Int as coins` and we make the  
        //         {
        //             $$type:'UpdateProfileFactory', 
        //             content: PROFILE_FACTORY_DATA.content,
        //             cost: toNano('-1'),
        //         }
        // the cost can't be equal to negative 
    });
});

describe('ProfileFactory Withdraw', () => {
    let blockchain: Blockchain;
    let educator: SandboxContract<TreasuryContract>;
    let profileFactory: SandboxContract<ProfileFactory>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        educator = await blockchain.treasury('educator');
        profileFactory = blockchain.openContract(await ProfileFactory.fromInit(educator.address));

        await profileFactory.send(
            educator.getSender(),
            {
                value: TON_COINS.minTonsForStorage + TON_COINS.gasConsumption,
            },
            {
                $$type: 'UpdateProfileFactory',
                content: PROFILE_FACTORY_DATA.content,
                cost: PROFILE_FACTORY_DATA.cost,
            }
        );
        // someone enrolled
        await profileFactory.send(
            educator.getSender(),
            {
                value: TON_COINS.minTonsForStorage + toNano("256"),
            },
            {
                $$type: 'ProfileIssue',
                profile_content: beginCell().storeStringTail("chetam").endCell(),
            }
        );
    });

    it('owner withdraw', async () => {
        const educatorBalanceBefore = await educator.getBalance();
        const withdrawResult = await profileFactory.send(
            educator.getSender(),
            { value: TON_COINS.gasConsumption },
            'Withdraw'
        );

        expect(withdrawResult.transactions).toHaveTransaction({
            from: educator.address,
            to: profileFactory.address,
            success: true
        });
        // 0.04 = 0.02 + 0.02 = minTonsForStorage + gasConsumtion (in smart contract)
        expect(await profileFactory.getGetBalance()).toEqual(toNano('0.04'));
        expect(await educator.getBalance()).toBeGreaterThan(educatorBalanceBefore);
    });

    it('not owner withdraw', async () => {
        const notOwner = await blockchain.treasury('notowner');
        const notOwnerBalanceBefore = await notOwner.getBalance();
        const profileFactoryBalanceBefore = await profileFactory.getGetBalance();
        const withdrawResult = await profileFactory.send(
            notOwner.getSender(),
            { value: TON_COINS.gasConsumption },
            'Withdraw'
        );

        expect(withdrawResult.transactions).toHaveTransaction({
            from: notOwner.address,
            to: profileFactory.address,
            success: false
        });
        expect(await profileFactory.getGetBalance()).toEqual(profileFactoryBalanceBefore);
        expect(await notOwner.getBalance()).toBeGreaterThan(notOwnerBalanceBefore - TON_COINS.gasConsumption);
    });
});

describe('ProfileFactory ProfileIssue', () => {
    let blockchain: Blockchain;
    let educator: SandboxContract<TreasuryContract>;
    let student: SandboxContract<TreasuryContract>;
    let profileFactory: SandboxContract<ProfileFactory>;
    let profile: SandboxContract<Profile>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        educator = await blockchain.treasury('educator');
        profileFactory = blockchain.openContract(await ProfileFactory.fromInit(educator.address));
        student = await blockchain.treasury('student');

        await profileFactory.send(
            educator.getSender(),
            {
                value: TON_COINS.minTonsForStorage + TON_COINS.gasConsumption,
            },
            {
                $$type: 'UpdateProfileFactory',
                content: PROFILE_FACTORY_DATA.content,
                cost: PROFILE_FACTORY_DATA.cost,
            }
        );
    });

    it('issue profile', async () => {
        const issueCost = (await profileFactory.getGetProfileFactoryData()).cost;
        const profileIssueResult = await profileFactory.send(
            educator.getSender(),
            { value: issueCost },
            {
                $$type: 'ProfileIssue',
                profile_content: beginCell().storeStringTail("chetam").endCell(),
            }
        );

        expect(profileIssueResult.transactions).toHaveTransaction({
            from: educator.address,
            to: profileFactory.address,
            success: true,
        });

        profile = blockchain.openContract(await Profile.fromInit(profileFactory.address, 0n));
        const profileData = await profile.getGetNftData();
        expect(profileData.collection_address).toEqualAddress(profileFactory.address);
        expect(profileData.owner_address).toEqualAddress(educator.address);
        expect(profileData.is_initialized).toEqual(true);
    });
});

describe('Profile Transfer', () => {
    let blockchain: Blockchain;
    let educator: SandboxContract<TreasuryContract>;
    let student: SandboxContract<TreasuryContract>;
    let profileFactory: SandboxContract<ProfileFactory>;
    let profile: SandboxContract<Profile>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        educator = await blockchain.treasury('educator');
        profileFactory = blockchain.openContract(await ProfileFactory.fromInit(educator.address));
        profile = blockchain.openContract(await Profile.fromInit(profileFactory.address, 0n));
        student = await blockchain.treasury('student');

        await profileFactory.send(
            educator.getSender(),
            {
                value: TON_COINS.minTonsForStorage + TON_COINS.gasConsumption,
            },
            {
                $$type: 'UpdateProfileFactory',
                content: PROFILE_FACTORY_DATA.content,
                cost: PROFILE_FACTORY_DATA.cost,
            }
        );
        await profileFactory.send(
            educator.getSender(),
            { value: TON_COINS.minTonsForStorage + TON_COINS.gasConsumption },
            {
                $$type: 'ProfileIssue',
                profile_content: beginCell().storeStringTail("chetam").endCell(),
            }
        );
    });

    it('transfer profile (should be not success)', async () => {
        const profileTransferResult = await profile.send(
            student.getSender(),
            { value: TON_COINS.gasConsumption },
            {
                $$type: 'Transfer',
                query_id: 0n,
                new_owner: educator.address,
                response_destination: educator.address,
                custom_payload: beginCell().endCell(),
                forward_amount: 0n,
                forward_payload: beginCell().endCell().asSlice(),
            }
        );
        expect(profileTransferResult.transactions).toHaveTransaction({
            from: student.address,
            to: profile.address,
            success: false,
        });
    });
});