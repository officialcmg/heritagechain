
# HeritageChain Frontend Logic Explainer

This document explains the logic and structure of the HeritageChain frontend application.

## Core Architecture

The application is built using:
- React for the UI components
- React Router for navigation
- Wagmi/ConnectKit for wallet connection and blockchain interaction
- TailwindCSS for styling

## Web3 Configuration

The `web3.ts` file contains the configuration for connecting to blockchain networks, specifically:

1. Defining a custom chain for Lisk Sepolia testnet
2. Setting up ConnectKit configuration with wagmi
3. Defining contract ABIs and addresses for interaction

## Application Flow

### Wallet Connection

The user first needs to connect their wallet using ConnectKit:
- TopBar component shows the connect button
- Once connected, the wallet address is displayed and user gets access to the full functionality

### Creating a Legacy Plan

1. **Smart Contract Deployment**:
   - When a user clicks "Create Legacy Plan" button on the Dashboard, the app first checks if they already have a deployed HeritageChain contract
   - If not, it calls the `deployHeritageChain` function on the factory contract
   - Once deployed, the contract address is stored in local storage

2. **Beneficiary Configuration**:
   - User adds beneficiary addresses and their percentage allocations
   - System validates the total should be 100%
   - Implements the `configureBeneficiaries` function from the smart contract

3. **Trigger Configuration**:
   - User can select either:
     - Time-based trigger: Sets a specific date for distribution using `setTimeTrigger`
     - Voluntary trigger: Allows manual activation using `setVoluntaryTrigger`

4. **Asset Deposit**:
   - User can deposit different types of assets:
     - ETH using the `depositETH` function
     - ERC20 tokens using the `depositERC20` function
     - ERC721 (NFTs) using the `depositERC721` function

### Monitoring and Management

The app provides interfaces for:
- Dashboard: Displays overall status and summary
- Beneficiaries: Manage beneficiary allocations
- Triggers: Configure and monitor trigger status
- Legacy Status: Track the distribution status

### Smart Contract Interaction

All interactions with the blockchain are handled through the wagmi hooks:
- `useContractRead`: For reading data from the contract
- `useContractWrite`: For executing state-changing functions
- `useBalance`: For checking the user's ETH balance

## Key Components

1. **Layout**: Provides the overall structure with sidebar and topbar
2. **Dashboard**: Main control center showing user status and actions
3. **CreateLegacyPlan**: Wizard interface for setting up a new legacy plan
4. **Beneficiaries, Triggers, Status pages**: Detailed management interfaces

## State Management

- Local component state for UI interactions
- Local storage for persistence of the deployed contract address
- React Router for navigation state
- Wagmi/ConnectKit for wallet and blockchain state

## Error Handling and Notifications

The app uses toast notifications to provide feedback on:
- Transaction submissions
- Transaction completions
- Errors during contract interactions
- Validation errors in forms

This creates a robust user experience with clear feedback at every step of the process.
