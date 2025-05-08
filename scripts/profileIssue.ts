import { toNano, Address } from '@ton/core';
import { ProfileFactory } from '../wrappers/ProfileFactory';
import { NetworkProvider } from '@ton/blueprint';
import { encodeOffChainContent } from "./utils/utils"

////        bafkreiagbirf6vxelu7rewv5vhf4gtrebmykpqnljniqqysmg4xkprvrhm

export async function run(provider: NetworkProvider) {
    const profileFactory = provider.open(await ProfileFactory.fromInit(Address.parse("0QC4hAk6Xhs4UY3dPZ3o0UbR5dnV4EeO-6I0dp13fYcsjAxo"), 0n));
    
    await profileFactory.send(
        provider.sender(),
        {
            value: toNano('5'),
        },
        {
            $$type: 'ProfileIssue',
            profile_content: encodeOffChainContent("ipfs://bafkreiagbirf6vxelu7rewv5vhf4gtrebmykpqnljniqqysmg4xkprvrhm"),
        }
    );

    await provider.waitForDeploy(profileFactory.address);
}
