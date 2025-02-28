
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccount, useContractRead, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { GitFork, Clock, Check, AlertCircle, Hourglass, ArrowLeft, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { HERITAGE_CHAIN_FACTORY_ABI, HERITAGE_CHAIN_ABI, HERITAGE_CHAIN_FACTORY_ADDRESS } from "@/config/web3";
import { formatDistance } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatEther } from "viem";
import { fetchBeneficiaryData, simulateBeneficiaryData } from "@/utils/beneficiaryUtils";
import type { Beneficiary } from "@/utils/beneficiaryUtils";

export default function Status() {
  const { isConnected, address, chain } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [heritageChainAddress, setHeritageChainAddress] = useState<`0x${string}` | null>(null);
  const [triggerType, setTriggerType] = useState<string>("NONE");
  const [triggerActivated, setTriggerActivated] = useState<boolean>(false);
  const [triggerTime, setTriggerTime] = useState<number | null>(null);
  const [isDistributed, setIsDistributed] = useState<boolean>(false);
  const [totalETH, setTotalETH] = useState<string>("0");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { writeContract, isPending, error: writeError } = useWriteContract();

  // Get the HeritageChain address from the factory
  const { data: contractAddress, isError: isFactoryError, refetch: refetchContractAddress } = useContractRead({
    address: HERITAGE_CHAIN_FACTORY_ADDRESS,
    abi: HERITAGE_CHAIN_FACTORY_ABI,
    functionName: 'getUserHeritageChain',
    args: [address],
    query: {
      enabled: !!address,
      retry: false
    }
  });

  // Wait for transaction receipt
  const { data: receipt, isLoading: isWaitingForReceipt } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: !!txHash
    }
  });

  // Set HeritageChain address when we get it from the factory
  useEffect(() => {
    if (contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000") {
      setHeritageChainAddress(contractAddress as `0x${string}`);
    } else {
      setHeritageChainAddress(null);
    }
  }, [contractAddress]);

  // Read contract data - Trigger info
  const { data: triggerData, refetch: refetchTrigger } = useContractRead({
    address: heritageChainAddress,
    abi: HERITAGE_CHAIN_ABI,
    functionName: 'trigger',
    query: {
      enabled: !!heritageChainAddress
    }
  });

  // Read contract data - is distributed
  const { data: distributedData, refetch: refetchDistributed } = useContractRead({
    address: heritageChainAddress,
    abi: HERITAGE_CHAIN_ABI,
    functionName: 'isDistributed',
    query: {
      enabled: !!heritageChainAddress
    }
  });

  // Read contract data - total ETH deposited
  const { data: totalETHData, refetch: refetchTotalETH } = useContractRead({
    address: heritageChainAddress,
    abi: HERITAGE_CHAIN_ABI,
    functionName: 'totalETHDeposited',
    query: {
      enabled: !!heritageChainAddress
    }
  });

  // Read contract data - beneficiary count
  const { data: beneficiaryCount, refetch: refetchBeneficiaryCount } = useContractRead({
    address: heritageChainAddress,
    abi: HERITAGE_CHAIN_ABI,
    functionName: 'getBeneficiaryCount',
    query: {
      enabled: !!heritageChainAddress
    }
  });

  // Show error toast if writeError exists
  useEffect(() => {
    if (writeError) {
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

  // Effect to handle transaction receipt
  useEffect(() => {
    if (receipt) {
      setTxHash(null);
      
      // Refetch all contract data
      refetchTrigger();
      refetchDistributed();
      refetchTotalETH();
      refetchBeneficiaryCount();
      refetchContractAddress();
      loadBeneficiaryData();
      
      toast({
        title: "Transaction Confirmed",
        description: "Your action has been successfully processed.",
      });
      
      // If the transaction was for cancellation, navigate back to dashboard
      if (receipt.status === "success") {
        refetchDistributed();
        
        setTimeout(() => {
          refetchDistributed();
          refetchContractAddress();
          
          if (isDistributed) {
            toast({
              title: "Legacy Plan Cancelled",
              description: "Your legacy plan has been cancelled and all assets have been returned to your wallet.",
            });
            
            navigate('/');
          }
        }, 2000);
      }
    }
  }, [receipt, refetchTrigger, refetchDistributed, refetchTotalETH, refetchBeneficiaryCount, refetchContractAddress, isDistributed, navigate, toast]);

  // Update state based on contract data
  useEffect(() => {
    if (triggerData) {
      // triggerType is an enum: 0=NONE, 1=TIME_BASED, 2=VOLUNTARY
      const triggerTypeMap = ["NONE", "TIME_BASED", "VOLUNTARY"];
      setTriggerType(triggerTypeMap[Number(triggerData[0])]);
      setTriggerTime(Number(triggerData[1]));
      setTriggerActivated(triggerData[2]);
    }
  }, [triggerData]);

  useEffect(() => {
    if (distributedData !== undefined) {
      setIsDistributed(distributedData as boolean);
      
      // If plan is distributed, we should refetch the contract address from factory
      if (distributedData) {
        refetchContractAddress();
      }
    }
  }, [distributedData, refetchContractAddress]);

  useEffect(() => {
    if (totalETHData) {
      // Convert from wei to ETH
      const ethAmount = formatEther(totalETHData);
      setTotalETH(Number(ethAmount).toFixed(4));
    }
  }, [totalETHData]);

  // Load beneficiary data using the utility function
  const loadBeneficiaryData = async () => {
    try {
      const beneficiaryData = await fetchBeneficiaryData(heritageChainAddress, chain);
      
      if (beneficiaryData.length > 0) {
        setBeneficiaries(beneficiaryData);
      } else if (beneficiaryCount && Number(beneficiaryCount) > 0) {
        // If we couldn't get real data but we know there are beneficiaries,
        // use simulated data for demo purposes
        const simulatedData = simulateBeneficiaryData(Number(beneficiaryCount));
        setBeneficiaries(simulatedData);
      } else {
        setBeneficiaries([]);
      }
    } catch (error) {
      console.error("Error loading beneficiary data:", error);
      if (beneficiaryCount && Number(beneficiaryCount) > 0) {
        const simulatedData = simulateBeneficiaryData(Number(beneficiaryCount));
        setBeneficiaries(simulatedData);
      }
    }
  };

  // Fetch beneficiary data when contract information changes
  useEffect(() => {
    loadBeneficiaryData();
  }, [heritageChainAddress, beneficiaryCount, chain]);

  // Refresh contract data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (heritageChainAddress) {
        refetchTrigger();
        refetchDistributed();
        refetchTotalETH();
        refetchBeneficiaryCount();
        loadBeneficiaryData();
      }
      
      // Always refetch the contract address
      if (address) {
        refetchContractAddress();
      }
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [heritageChainAddress, address, refetchTrigger, refetchDistributed, refetchTotalETH, refetchBeneficiaryCount, refetchContractAddress]);

  // Activate voluntary trigger
  const activateVoluntaryTrigger = () => {
    if (!heritageChainAddress || !address || !chain) {
      toast({
        title: "Error",
        description: "Missing contract address or wallet connection.",
        variant: "destructive",
      });
      return;
    }

    if (triggerType !== "VOLUNTARY") {
      toast({
        title: "Error",
        description: "This legacy plan does not have a voluntary trigger.",
        variant: "destructive",
      });
      return;
    }

    if (triggerActivated) {
      toast({
        title: "Error",
        description: "Trigger has already been activated.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Activating Trigger",
      description: "Submitting transaction to activate the voluntary trigger...",
    });

    writeContract({
      address: heritageChainAddress,
      abi: HERITAGE_CHAIN_ABI,
      functionName: 'activateVoluntaryTrigger',
      account: address,
      chain: chain,
    }, {
      onSuccess: (hash) => {
        setTxHash(hash);
        toast({
          title: "Transaction Submitted",
          description: "Your voluntary trigger activation is being processed.",
        });
      }
    });
  };

  // Check time-based trigger
  const checkTimeBasedTrigger = () => {
    if (!heritageChainAddress || !address || !chain) {
      toast({
        title: "Error",
        description: "Missing contract address or wallet connection.",
        variant: "destructive",
      });
      return;
    }

    if (triggerType !== "TIME_BASED") {
      toast({
        title: "Error",
        description: "This legacy plan does not have a time-based trigger.",
        variant: "destructive",
      });
      return;
    }

    if (triggerActivated) {
      toast({
        title: "Error",
        description: "Trigger has already been activated.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Checking Trigger",
      description: "Submitting transaction to check if time-based trigger conditions are met...",
    });

    writeContract({
      address: heritageChainAddress,
      abi: HERITAGE_CHAIN_ABI,
      functionName: 'checkTimeBasedTrigger',
      account: address,
      chain: chain,
    }, {
      onSuccess: (hash) => {
        setTxHash(hash);
        toast({
          title: "Transaction Submitted",
          description: "Checking if time-based trigger conditions are met.",
        });
      }
    });
  };

  // Cancel legacy plan
  const cancelLegacyPlan = () => {
    if (!heritageChainAddress || !address || !chain) {
      toast({
        title: "Error",
        description: "Missing contract address or wallet connection.",
        variant: "destructive",
      });
      return;
    }

    if (triggerActivated || isDistributed) {
      toast({
        title: "Error",
        description: "Cannot cancel legacy plan after trigger activation or distribution.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Cancelling Legacy Plan",
      description: "Submitting transaction to cancel your legacy plan...",
    });

    writeContract({
      address: heritageChainAddress,
      abi: HERITAGE_CHAIN_ABI,
      functionName: 'cancelLegacyPlan',
      account: address,
      chain: chain,
    }, {
      onSuccess: (hash) => {
        setTxHash(hash);
        toast({
          title: "Transaction Submitted",
          description: "Your legacy plan cancellation is being processed.",
        });
      }
    });
  };

  if (!isConnected) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Card className="glass-card w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please connect your wallet to view legacy status.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle factory error as a "no contract" state
  if (isFactoryError || !heritageChainAddress || isDistributed) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Card className="glass-card w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>No Active Legacy Plan Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {isDistributed 
                ? "Your legacy plan has been distributed." 
                : "You don't have an active legacy plan. Please create one from the dashboard."}
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              onClick={() => navigate('/')}
              className="glass"
            >
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-4 px-4 sm:px-6 md:px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Legacy Status</h2>
        <Button 
          variant="destructive" 
          className="neo-blur"
          onClick={cancelLegacyPlan}
          disabled={triggerActivated || isDistributed || isPending || isWaitingForReceipt}
        >
          {isPending || isWaitingForReceipt ? (
            <>
              <div className="h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              Processing...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" /> Cancel Legacy Plan
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contract Status</CardTitle>
            <GitFork className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isDistributed 
                ? "Distributed" 
                : triggerActivated 
                  ? "Activated" 
                  : triggerType === "NONE" 
                    ? "Pending Configuration" 
                    : "Pending Activation"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isDistributed 
                ? "Assets have been distributed to beneficiaries" 
                : triggerActivated 
                  ? "Trigger activated, distribution in progress" 
                  : "No active distributions"}
            </p>
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="text-sm font-medium mb-2">Contract Address</div>
              <div className="p-2 bg-primary/10 rounded-md">
                <p className="text-xs font-mono break-all">{heritageChainAddress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trigger Settings</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {triggerType === "NONE" 
                ? "Not Set" 
                : triggerType === "TIME_BASED" 
                  ? "Time-Based" 
                  : "Voluntary"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {triggerType === "NONE" 
                ? "No trigger configured yet" 
                : triggerType === "TIME_BASED" 
                  ? triggerTime 
                    ? `Scheduled for ${new Date(triggerTime * 1000).toLocaleDateString()} ${new Date(triggerTime * 1000).toLocaleTimeString()} (${formatDistance(new Date(triggerTime * 1000), new Date(), { addSuffix: true })})` 
                    : "Time-based trigger configured" 
                  : "Manual activation by owner"}
            </p>
            {triggerType !== "NONE" && !triggerActivated && !isDistributed && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <Button 
                  onClick={triggerType === "TIME_BASED" ? checkTimeBasedTrigger : activateVoluntaryTrigger}
                  className="w-full neo-blur green-glow bg-black/50 hover:bg-black/70"
                  disabled={isPending || isWaitingForReceipt}
                >
                  {isPending || isWaitingForReceipt ? (
                    <>
                      <div className="h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      {isWaitingForReceipt ? "Confirming..." : "Processing..."}
                    </>
                  ) : triggerType === "TIME_BASED" ? (
                    <>
                      <Hourglass className="mr-2 h-4 w-4" /> Check Time Trigger
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" /> Activate Voluntary Trigger
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asset Summary</CardTitle>
            <GitFork className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalETH} ETH</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total value of deposited assets
            </p>
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="text-sm font-medium mb-2">Distribution</div>
              {beneficiaries.length > 0 ? (
                <div className="space-y-2">
                  {beneficiaries.map((ben, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-primary/5 rounded-md">
                      <span className="text-xs font-mono truncate max-w-[120px]">
                        {ben.address.slice(0, 6)}...{ben.address.slice(-4)}
                      </span>
                      <span className="text-xs font-bold">{ben.percentage}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No beneficiaries configured</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-center">
        <Button 
          onClick={() => navigate('/')}
          variant="outline" 
          className="neo-blur bg-primary/10 hover:bg-primary/20 border-primary/30"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
