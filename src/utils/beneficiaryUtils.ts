
import { createPublicClient, http, parseAbiItem } from "viem";
import type { Chain } from 'viem/chains';

export interface Beneficiary {
  address: string;
  percentage: number;
}

/**
 * Fetches beneficiary information from contract events
 * @param heritageChainAddress The address of the HeritageChain contract
 * @param chain The current connected chain
 * @returns Array of beneficiaries with their addresses and percentages
 */
export async function fetchBeneficiaryData(
  heritageChainAddress: `0x${string}` | string | undefined, 
  chain: Chain | undefined
): Promise<Beneficiary[]> {
  if (!heritageChainAddress || 
      heritageChainAddress === "0x0000000000000000000000000000000000000000" ||
      !chain) {
    return [];
  }

  try {
    // Create a public client to interact with the blockchain
    const publicClient = createPublicClient({
      chain,
      transport: http()
    });

    // First get the BeneficiariesConfigured events to find the latest configuration
    const configEvents = await publicClient.getLogs({
      address: heritageChainAddress as `0x${string}`,
      event: parseAbiItem('event BeneficiariesConfigured(uint256 beneficiaryCount)'),
      fromBlock: 'earliest',
      toBlock: 'latest'
    });

    if (configEvents.length === 0) {
      return [];
    }

    // Sort by block number descending to get the latest configuration
    const sortedConfigEvents = [...configEvents].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
    const latestConfigEvent = sortedConfigEvents[0];
    
    // Get the BeneficiaryAdded events that came after the second last configuration (if exists)
    // or from the beginning if there's only one configuration
    let fromBlock = 0n;
    if (sortedConfigEvents.length > 1) {
      // Use the block number of the second last configuration as the starting point
      fromBlock = sortedConfigEvents[1].blockNumber;
    }

    // Get the BeneficiaryAdded events from the determined block until the latest block
    const beneficiaryEvents = await publicClient.getLogs({
      address: heritageChainAddress as `0x${string}`,
      event: parseAbiItem('event BeneficiaryAdded(address indexed beneficiaryAddress, uint256 sharePercentage)'),
      fromBlock: fromBlock,
      toBlock: latestConfigEvent.blockNumber
    });

    // Process the events to get beneficiary data
    const beneficiaryList = beneficiaryEvents.map(event => {
      const beneficiaryAddress = event.args.beneficiaryAddress as string;
      const sharePercentage = Number(event.args.sharePercentage) / 100; // Convert basis points to percentage
      
      return {
        address: beneficiaryAddress,
        percentage: sharePercentage
      };
    });

    console.log("Fetched beneficiaries from events:", beneficiaryList);
    return beneficiaryList;
  } catch (error) {
    console.error("Error fetching beneficiary events:", error);
    return [];
  }
}

/**
 * Generates simulated beneficiary data when real data can't be fetched
 * Used for development and demo purposes
 * @param count Number of beneficiaries to simulate
 * @returns Array of simulated beneficiaries
 */
export function simulateBeneficiaryData(count: number): Beneficiary[] {
  if (!count || count <= 0) return [];
  
  const simulatedBeneficiaries: Beneficiary[] = [];
  
  // Distribute percentages evenly
  const basePercentage = Math.floor(100 / count);
  let remaining = 100 - (basePercentage * count);
  
  for (let i = 0; i < count; i++) {
    const extraPercentage = (i === count - 1) ? remaining : 0;
    simulatedBeneficiaries.push({
      address: `0x${Math.random().toString(16).slice(2, 42)}`,
      percentage: basePercentage + extraPercentage
    });
  }
  
  return simulatedBeneficiaries;
}
