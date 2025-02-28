
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAccount, useContractRead, useBalance, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ArrowRight, Plus, Users, Clock, Wallet, Copy, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HERITAGE_CHAIN_FACTORY_ABI, HERITAGE_CHAIN_ABI, HERITAGE_CHAIN_FACTORY_ADDRESS } from "@/config/web3";
import { formatUnits } from "viem";

export default function Dashboard() {
  const { isConnected, address, chain } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDeploying, setIsDeploying] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { data: ethBalance } = useBalance({ address });
  const { writeContract, isPending, error: writeError } = useWriteContract();

  // Get the HeritageChain address from the factory
  const { data: heritageChainAddress, isError: isFactoryError, refetch: refetchContractAddress } = useContractRead({
    address: HERITAGE_CHAIN_FACTORY_ADDRESS,
    abi: HERITAGE_CHAIN_FACTORY_ABI,
    functionName: 'getUserHeritageChain',
    args: [address],
    query: {
      enabled: !!address,
      retry: false
    }
  });

  // Contract reads
  const { data: beneficiaryCount, refetch: refetchBeneficiaryCount } = useContractRead({
    address: heritageChainAddress as `0x${string}` | undefined,
    abi: HERITAGE_CHAIN_ABI,
    functionName: 'getBeneficiaryCount',
    query: {
      enabled: !!heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000"
    }
  });

  const { data: triggerData, refetch: refetchTrigger } = useContractRead({
    address: heritageChainAddress as `0x${string}` | undefined,
    abi: HERITAGE_CHAIN_ABI,
    functionName: 'trigger',
    query: {
      enabled: !!heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000"
    }
  });

  const { data: isDistributed, refetch: refetchDistributed } = useContractRead({
    address: heritageChainAddress as `0x${string}` | undefined,
    abi: HERITAGE_CHAIN_ABI,
    functionName: 'isDistributed',
    query: {
      enabled: !!heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000"
    }
  });

  // Wait for transaction receipt
  const { data: receipt, isLoading: isWaitingForReceipt } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: !!txHash
    }
  });

  // Show error toast if writeError exists
  useEffect(() => {
    if (writeError) {
      setIsDeploying(false);
      const errorMessage = writeError.message || "Transaction failed";
      // Try to extract revert reason if available
      const revertMatch = errorMessage.match(/reverted with reason string '([^']+)'/);
      const revertReason = revertMatch ? revertMatch[1] : null;
      
      toast({
        title: "Transaction Failed",
        description: revertReason || errorMessage,
        variant: "destructive",
      });
    }
  }, [writeError, toast]);

  // Handle transaction receipt
  useEffect(() => {
    if (receipt) {
      // Refetch contract address
      refetchContractAddress();
      
      // If we were deploying a contract
      if (isDeploying) {
        setIsDeploying(false);
        setTxHash(null);
        
        setTimeout(() => {
          refetchContractAddress();
          
          if (heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000") {
            toast({
              title: "Contract Deployed",
              description: "Your HeritageChain contract has been successfully deployed!",
            });
            navigate('/create-legacy-plan');
          }
        }, 2000);
      }
      
      // Refetch any contract data
      if (heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000") {
        refetchBeneficiaryCount();
        refetchTrigger();
        refetchDistributed();
      }
      
      setTxHash(null);
    }
  }, [receipt, isDeploying, heritageChainAddress, refetchContractAddress, refetchBeneficiaryCount, refetchTrigger, refetchDistributed, navigate, toast]);

  // Refetch data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (address) {
        refetchContractAddress();
      }
      
      if (heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000") {
        refetchBeneficiaryCount();
        refetchTrigger();
        refetchDistributed();
      }
    }, 10000); // every 10 seconds
    
    return () => clearInterval(interval);
  }, [address, heritageChainAddress, refetchContractAddress, refetchBeneficiaryCount, refetchTrigger, refetchDistributed]);

  const createLegacyPlan = () => {
    if (!isConnected || !address || !chain) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create a legacy plan.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if user already has a HeritageChain contract
    if (heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000" && !isDistributed) {
      navigate('/create-legacy-plan');
      return;
    }
    
    setIsDeploying(true);
    
    toast({
      title: "Deploying Contract",
      description: "Submitting transaction to create your HeritageChain contract...",
    });
    
    // Deploy a new HeritageChain contract using the factory
    writeContract({
      address: HERITAGE_CHAIN_FACTORY_ADDRESS,
      abi: HERITAGE_CHAIN_FACTORY_ABI,
      functionName: 'deployHeritageChain',
      account: address,
      chain: chain
    }, {
      onSuccess: (hash) => {
        setTxHash(hash);
        toast({
          title: "Transaction Submitted",
          description: "Your HeritageChain contract is being deployed.",
        });
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard.",
    });
  };

  // Check if the contract is active
  const isContractActive = heritageChainAddress && 
                          heritageChainAddress !== "0x0000000000000000000000000000000000000000" && 
                          !isDistributed;

  if (!isConnected) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Card className="glass-card w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please connect your wallet to create and manage your digital legacy.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-4 px-4 sm:px-6 md:px-8">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Wallet Card */}
        <Card className="glass-card col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Assets</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ethBalance ? Number(formatUnits(ethBalance.value, 18)).toFixed(4) : "0"} ETH
            </div>
            {address && (
              <div className="mt-4 p-2 bg-primary/10 rounded-lg flex items-center justify-between">
                <span className="text-xs font-mono truncate">
                  {address.slice(0, 8)}...{address.slice(-6)}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={() => copyToClipboard(address)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Beneficiaries Card */}
        <Card className="glass-card" onClick={() => isContractActive && navigate('/beneficiaries')} role="button">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficiaries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isContractActive ? (
              <>
                <div className="text-2xl font-bold">{beneficiaryCount ? Number(beneficiaryCount).toString() : "0"}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Number(beneficiaryCount || 0) === 0 
                    ? "No beneficiaries set up yet" 
                    : `${beneficiaryCount} ${Number(beneficiaryCount) === 1 ? "person" : "people"} added to your legacy plan`}
                </p>
                <div className="mt-4 p-2 bg-primary/10 rounded-lg flex justify-between items-center">
                  {Number(beneficiaryCount || 0) === 0 ? (
                    <>
                      <span className="text-xs">Configure your beneficiaries</span>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs">View and manage</span>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">
                  No active legacy plan
                </p>
                <div className="mt-4 p-2 bg-primary/10 rounded-lg">
                  <span className="text-xs">Create a legacy plan first</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Triggers Card */}
        <Card className="glass-card" onClick={() => isContractActive && navigate('/triggers')} role="button">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Triggers</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isContractActive && triggerData ? (
              <>
                <div className="text-2xl font-bold">
                  {Number(triggerData[0]) === 0 ? "Not Set" : Number(triggerData[0]) === 1 ? "Time-Based" : "Voluntary"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Number(triggerData[0]) === 0 
                    ? "No trigger configured yet" 
                    : triggerData[2] 
                      ? "Trigger activated" 
                      : Number(triggerData[0]) === 1 
                        ? `Scheduled for ${new Date(Number(triggerData[1]) * 1000).toLocaleDateString()}` 
                        : "Ready for manual activation"}
                </p>
                <div className="mt-4 p-2 bg-primary/10 rounded-lg flex justify-between items-center">
                  <span className="text-xs">{Number(triggerData[0]) === 0 ? "Set up your triggers" : "View and manage"}</span>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">Not Set</div>
                <p className="text-xs text-muted-foreground mt-1">
                  No active legacy plan
                </p>
                <div className="mt-4 p-2 bg-primary/10 rounded-lg">
                  <span className="text-xs">Create a legacy plan first</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Legacy Plans</CardTitle>
            <CardDescription>
              Create and manage your digital legacy plans
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isContractActive ? (
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium">Your HeritageChain Contract</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 ml-2" 
                      onClick={() => copyToClipboard(heritageChainAddress as string)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Your digital assets will be distributed according to your configuration
                  </p>
                  <div className="mb-4">
                    <p className="text-xs mb-1">Contract Address:</p>
                    <p className="font-mono text-xs break-all bg-primary/10 p-2 rounded">{heritageChainAddress}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      className="neo-blur text-sm"
                      onClick={() => navigate('/status')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" /> View Legacy Status
                    </Button>
                    <Button
                      variant="outline"
                      className="neo-blur text-sm"
                      onClick={() => navigate('/create-legacy-plan')}
                    >
                      <ArrowRight className="mr-2 h-4 w-4" /> Manage Legacy Plan
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-6">
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium">Create Your First Legacy Plan</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Set up a smart contract to manage the distribution of your digital assets to your beneficiaries
                  </p>
                </div>
                <Button 
                  onClick={createLegacyPlan} 
                  className="glass green-glow"
                  disabled={isPending || isWaitingForReceipt || isDeploying}
                >
                  {isPending || isWaitingForReceipt || isDeploying ? (
                    <>
                      <div className="h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      {isWaitingForReceipt ? "Confirming..." : "Deploying Contract..."}
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" /> Create Legacy Plan
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
