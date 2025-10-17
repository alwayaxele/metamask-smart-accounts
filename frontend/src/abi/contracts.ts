
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
import { AppHubABI } from './AppHubABI';
import { AppHubAddresses } from './AppHubAddresses';
import { MyTokenABI } from './MyTokenABI';
import { TokenAddresses, getTokenAddress, getTokens } from './TokenAddresses';

// Export tất cả ABIs
export const ABIs = {
  AppHub: AppHubABI.abi,
  MyToken: MyTokenABI.abi,
};

// Export tất cả Addresses
export const Addresses = {
  AppHub: AppHubAddresses,
  Tokens: TokenAddresses,
};

// Export individual contracts
export { AppHubABI, AppHubAddresses };
export { MyTokenABI, TokenAddresses, getTokenAddress, getTokens };
