import { toNano, Address, beginCell, Cell } from '@ton/core';
import { ProfileFactory } from '../wrappers/ProfileFactory';
import { NetworkProvider } from '@ton/blueprint';
import { encodeOffChainContent } from "./utils/utils"

export async function run(provider: NetworkProvider) {
    const course = provider.open(await ProfileFactory.fromInit(
        // Angsar: 0QC4hAk6Xhs4UY3dPZ3o0UbR5dnV4EeO-6I0dp13fYcsjAxo
        // Amandyk: 0QA8-SVqn4H2dew-CzMrfzpqg2ReIQSYCFxkzpr4ZnwcunaS
        Address.parse("0QC4hAk6Xhs4UY3dPZ3o0UbR5dnV4EeO-6I0dp13fYcsjAxo"), 0n));

    await course.send(
        provider.sender(),
        {
            value: toNano('0.03'),
        },
        {
            $$type: 'UpdateProfileFactory',
            
            // content: encodeOffChainContent("ipfs://bafkreib4j64ro2ihzenokrsqqbj5cyc7omhkxa3jain3dvqofulxxqkpgi"),
            content: encodeOffChainContent("ipfs://bafkreiau67cgthx6sgmb5vtfrlis2gfxvlqwknkqgnc4cf7qltmtfs2aqi"),
            cost: toNano('5'),
        },
    );
    await provider.waitForDeploy(course.address);
}


