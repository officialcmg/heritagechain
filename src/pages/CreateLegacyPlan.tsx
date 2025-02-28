
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAccount, useContractRead, useWriteContract, useBalance, useWaitForTransactionReceipt } from "wagmi";
import { ArrowLeft, UserPlus, Clock, Wallet, Check, Calendar, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HERITAGE_CHAIN_ABI, HERITAGE_CHAIN_FACTORY_ABI, HERITAGE_CHAIN_FACTORY_ADDRESS } from "@/config/web3";
import { parseEther, formatEther } from "viem";

export default function CreateLegacyPlan() {
  const { isConnected, address, chain } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState("deposit");
  const [beneficiaries, setBeneficiaries] = useState<{ address: string; percentage: number }[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [newPercentage, setNewPercentage] = useState("");
  const [triggerType, setTriggerType] = useState<"time" | "voluntary">("voluntary");
  const [triggerDate, setTriggerDate] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | null>(null);
  const [beneficiaryTxHash, setBeneficiaryTxHash] = useState<`0x${string}` | null>(null);
  const [triggerTxHash, setTriggerTxHash] = useState<`0x${string}` | null>(null);
  const { data: balance, refetch: refetchBalance } = useBalance({ address });
  const { writeContract, isPending } = useWriteContract();
  
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
  
  // Contract state readings
  const { data: contractTrigger, refetch: refetchTrigger } = useContractRead({
    address: heritageChainAddress as `0x${string}` | undefined,
    abi: HERITAGE_CHAIN_ABI,
    functionName: 'trigger',
    query: {
      enabled: !!heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000"
    }
  });
  
  const { data: contractBeneficiaryCount, refetch: refetchBeneficiaryCount } = useContractRead({
    address: heritageChainAddress as `0x${string}` | undefined,
    abi: HERITAGE_CHAIN_ABI,
    functionName: 'getBeneficiaryCount',
    query: {
      enabled: !!heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000"
    }
  });
  
  const { data: contractTotalETH, refetch: refetchTotalETH } = useContractRead({
    address: heritageChainAddress as `0x${string}` | undefined,
    abi: HERITAGE_CHAIN_ABI,
    functionName: 'totalETHDeposited',
    query: {
      enabled: !!heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000"
    }
  });
  
  // Transaction receipts
  const { data: depositReceipt, isLoading: isWaitingForDepositReceipt } = useWaitForTransactionReceipt({
    hash: depositTxHash,
    query: {
      enabled: !!depositTxHash
    }
  });
  
  const { data: beneficiaryReceipt, isLoading: isWaitingForBeneficiaryReceipt } = useWaitForTransactionReceipt({
    hash: beneficiaryTxHash,
    query: {
      enabled: !!beneficiaryTxHash
    }
  });
  
  const { data: triggerReceipt, isLoading: isWaitingForTriggerReceipt } = useWaitForTransactionReceipt({
    hash: triggerTxHash,
    query: {
      enabled: !!triggerTxHash
    }
  });

  // Set default trigger date to 30 days from now
  useEffect(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    setTriggerDate(thirtyDaysFromNow.toISOString().split('T')[0]);
  }, []);
  
  // Transaction receipt handling
  useEffect(() => {
    if (depositReceipt) {
      setDepositTxHash(null);
      refetchTotalETH();
      refetchBalance();
      toast({
        title: "Deposit Successful",
        description: `You've successfully deposited ${depositAmount} ETH to your legacy plan.`,
      });
      setDepositAmount("");
    }
  }, [depositReceipt, depositAmount, refetchBalance, refetchTotalETH, toast]);
  
  useEffect(() => {
    if (beneficiaryReceipt) {
      setBeneficiaryTxHash(null);
      refetchBeneficiaryCount();
      toast({
        title: "Beneficiaries Configured",
        description: "Your beneficiaries have been successfully configured.",
      });
      setCurrentTab("trigger");
    }
  }, [beneficiaryReceipt, refetchBeneficiaryCount, toast]);
  
  useEffect(() => {
    if (triggerReceipt) {
      setTriggerTxHash(null);
      refetchTrigger();
      toast({
        title: triggerType === "time" ? "Time Trigger Set" : "Voluntary Trigger Set",
        description: triggerType === "time" 
          ? `Your time-based trigger has been set for ${new Date(new Date(triggerDate).getTime()).toLocaleDateString()}.`
          : "Your voluntary trigger has been successfully set.",
      });
      
      setTimeout(() => {
        toast({
          title: "Legacy Plan Complete",
          description: "Your legacy plan has been fully configured!",
        });
        navigate('/status');
      }, 2000);
    }
  }, [triggerReceipt, triggerType, triggerDate, navigate, refetchTrigger, toast]);

  // Check requirements for each step
  const canConfigureBeneficiaries = !!contractTotalETH && Number(contractTotalETH) > 0;
  const canConfigureTriggers = canConfigureBeneficiaries && contractBeneficiaryCount && Number(contractBeneficiaryCount) > 0;

  // Check if contract already has this step configured
  const hasDeposits = !!contractTotalETH && Number(contractTotalETH) > 0;
  const hasBeneficiaries = !!contractBeneficiaryCount && Number(contractBeneficiaryCount) > 0;
  const hasTrigger = !!contractTrigger && Number(contractTrigger[0]) > 0;
  
  // Update current tab based on contract state
  useEffect(() => {
    if (hasDeposits && !hasBeneficiaries) {
      setCurrentTab("beneficiaries");
    } else if (hasDeposits && hasBeneficiaries && !hasTrigger) {
      setCurrentTab("trigger");
    }
  }, [hasDeposits, hasBeneficiaries, hasTrigger]);

  // Refresh contract data
  useEffect(() => {
    if (address) {
      refetchContractAddress();
    }
    
    if (heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000") {
      refetchTotalETH();
      refetchBeneficiaryCount();
      refetchTrigger();
    }
  }, [address, heritageChainAddress, refetchContractAddress, refetchTotalETH, refetchBeneficiaryCount, refetchTrigger]);

  if (!isConnected || !heritageChainAddress || heritageChainAddress === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Card className="glass-card w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>{!isConnected ? "Connect Wallet" : "No Legacy Plan Found"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {!isConnected 
                ? "Please connect your wallet to create a legacy plan." 
                : "You need to deploy a HeritageChain contract first."
              }
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

  const addBeneficiary = () => {
    if (!newAddress || !newPercentage) {
      toast({
        title: "Input Error",
        description: "Please enter both address and percentage.",
        variant: "destructive",
      });
      return;
    }

    const percentage = parseInt(newPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      toast({
        title: "Input Error",
        description: "Percentage must be between 1 and 100.",
        variant: "destructive",
      });
      return;
    }

    // Check total percentage
    const currentTotal = beneficiaries.reduce((sum, b) => sum + b.percentage, 0);
    if (currentTotal + percentage > 100) {
      toast({
        title: "Input Error",
        description: `Total percentage cannot exceed 100%. Current total: ${currentTotal}%`,
        variant: "destructive",
      });
      return;
    }

    setBeneficiaries([...beneficiaries, { address: newAddress, percentage }]);
    setNewAddress("");
    setNewPercentage("");
    
    toast({
      title: "Beneficiary Added",
      description: `Added ${newAddress.slice(0, 6)}...${newAddress.slice(-4)} with ${percentage}%`,
    });
  };

  const removeBeneficiary = (index: number) => {
    const newBeneficiaries = [...beneficiaries];
    newBeneficiaries.splice(index, 1);
    setBeneficiaries(newBeneficiaries);
  };

  const configureBeneficiaries = () => {
    if (!address || !chain) {
      toast({
        title: "Error",
        description: "Wallet connection issue. Please reconnect your wallet.",
        variant: "destructive",
      });
      return;
    }
    
    if (beneficiaries.length === 0) {
      toast({
        title: "No Beneficiaries",
        description: "Please add at least one beneficiary.",
        variant: "destructive",
      });
      return;
    }

    const total = beneficiaries.reduce((sum, b) => sum + b.percentage, 0);
    if (total !== 100) {
      toast({
        title: "Invalid Allocation",
        description: "Total allocation must equal 100%.",
        variant: "destructive",
      });
      return;
    }

    try {
      writeContract({
        address: heritageChainAddress as `0x${string}`,
        abi: HERITAGE_CHAIN_ABI,
        functionName: 'configureBeneficiaries',
        args: [
          beneficiaries.map(b => b.address as `0x${string}`),
          beneficiaries.map(b => BigInt(b.percentage * 100)), // Convert to basis points (100% = 10000)
        ],
        account: address,
        chain: chain,
      }, {
        onSuccess: (hash) => {
          setBeneficiaryTxHash(hash);
          toast({
            title: "Transaction Submitted",
            description: "Your beneficiaries are being configured. Please wait for confirmation.",
          });
        },
        onError: (error) => {
          console.error("Error configuring beneficiaries:", error);
          toast({
            title: "Configuration Failed",
            description: "There was an error configuring your beneficiaries.",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error("Error configuring beneficiaries:", error);
      toast({
        title: "Configuration Failed",
        description: "There was an error configuring your beneficiaries.",
        variant: "destructive",
      });
    }
  };

  const setTrigger = () => {
    if (!address || !chain) {
      toast({
        title: "Error",
        description: "Wallet connection issue. Please reconnect your wallet.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (triggerType === 'time') {
        // Validate the trigger date
        const triggerTimestamp = Math.floor(new Date(triggerDate).getTime() / 1000);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        if (isNaN(triggerTimestamp) || triggerTimestamp <= currentTimestamp) {
          toast({
            title: "Invalid Date",
            description: "Please select a date in the future.",
            variant: "destructive",
          });
          return;
        }

        writeContract({
          address: heritageChainAddress as `0x${string}`,
          abi: HERITAGE_CHAIN_ABI,
          functionName: 'setTimeTrigger',
          args: [BigInt(triggerTimestamp)],
          account: address,
          chain: chain,
        }, {
          onSuccess: (hash) => {
            setTriggerTxHash(hash);
            toast({
              title: "Transaction Submitted",
              description: "Your time trigger is being set. Please wait for confirmation.",
            });
          },
          onError: (error) => {
            console.error("Error setting time trigger:", error);
            toast({
              title: "Trigger Setup Failed",
              description: "There was an error setting your time-based trigger.",
              variant: "destructive",
            });
          }
        });
      } else {
        writeContract({
          address: heritageChainAddress as `0x${string}`,
          abi: HERITAGE_CHAIN_ABI,
          functionName: 'setVoluntaryTrigger',
          account: address,
          chain: chain,
        }, {
          onSuccess: (hash) => {
            setTriggerTxHash(hash);
            toast({
              title: "Transaction Submitted",
              description: "Your voluntary trigger is being set. Please wait for confirmation.",
            });
          },
          onError: (error) => {
            console.error("Error setting trigger:", error);
            toast({
              title: "Trigger Setup Failed",
              description: "There was an error setting up your trigger.",
              variant: "destructive",
            });
          }
        });
      }
    } catch (error) {
      console.error("Error setting trigger:", error);
      toast({
        title: "Trigger Setup Failed",
        description: "There was an error setting up your trigger.",
        variant: "destructive",
      });
    }
  };

  const depositETH = () => {
    if (!address || !chain) {
      toast({
        title: "Error",
        description: "Wallet connection issue. Please reconnect your wallet.",
        variant: "destructive",
      });
      return;
    }
    
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to deposit.",
        variant: "destructive",
      });
      return;
    }

    if (!balance) {
      toast({
        title: "Balance Error",
        description: "Unable to fetch your balance.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(depositAmount);
    const balanceNum = parseFloat(balance.formatted);
    
    if (amount > balanceNum) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough ETH. Your balance: ${balanceNum} ETH`,
        variant: "destructive",
      });
      return;
    }

    try {
      writeContract({
        address: heritageChainAddress as `0x${string}`,
        abi: HERITAGE_CHAIN_ABI,
        functionName: 'depositETH',
        value: parseEther(depositAmount),
        account: address,
        chain: chain,
      }, {
        onSuccess: (hash) => {
          setDepositTxHash(hash);
          toast({
            title: "Transaction Submitted",
            description: "Your ETH deposit is being processed. Please wait for confirmation.",
          });
        },
        onError: (error) => {
          console.error("Error depositing ETH:", error);
          toast({
            title: "Deposit Failed",
            description: "There was an error depositing your ETH.",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error("Error depositing ETH:", error);
      toast({
        title: "Deposit Failed",
        description: "There was an error depositing your ETH.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 mt-4 px-4 sm:px-6 md:px-8">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => navigate('/')} 
          className="glass h-10 w-10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create Legacy Plan</h2>
          <p className="text-muted-foreground mt-1">
            Set up your digital inheritance plan
          </p>
        </div>
      </div>

      <Tabs defaultValue="deposit" value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full glass">
          <TabsTrigger value="deposit" className="flex gap-2">
            <Wallet className="h-4 w-4" /> Deposit Assets
          </TabsTrigger>
          <TabsTrigger value="beneficiaries" className="flex gap-2" disabled={!canConfigureBeneficiaries && !hasBeneficiaries}>
            <UserPlus className="h-4 w-4" /> Beneficiaries
          </TabsTrigger>
          <TabsTrigger value="trigger" className="flex gap-2" disabled={!canConfigureTriggers && !hasTrigger}>
            <Clock className="h-4 w-4" /> Trigger Setup
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="deposit">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Deposit Assets</CardTitle>
              <CardDescription>
                Step 1: Add digital assets to your legacy plan that will be distributed to your beneficiaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border border-primary/20 rounded-lg p-6 bg-primary/5">
                <h3 className="text-lg font-medium mb-4">Deposit ETH</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">Your balance: {balance ? Number(balance.formatted).toFixed(4) : "0"} ETH</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Amount to deposit (ETH)"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="glass"
                    />
                    <Button 
                      onClick={depositETH} 
                      className="glass green-glow"
                      disabled={
                        !depositAmount || 
                        parseFloat(depositAmount) <= 0 || 
                        isPending || 
                        isWaitingForDepositReceipt
                      }
                    >
                      {isPending || isWaitingForDepositReceipt ? (
                        <>
                          <div className="h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                          {isWaitingForDepositReceipt ? "Confirming..." : "Processing..."}
                        </>
                      ) : (
                        "Deposit ETH"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="neo-blur rounded-lg p-4 mt-6">
                <h3 className="text-sm font-medium mb-2">Deposit Summary</h3>
                {hasDeposits ? (
                  <div className="flex items-center p-2 bg-primary/10 rounded-md">
                    <div className="h-4 w-4 bg-green-500 rounded-full mr-2 flex items-center justify-center">
                      <Check className="h-3 w-3 text-black" />
                    </div>
                    <p className="text-xs">
                      Deposited: {contractTotalETH ? formatEther(contractTotalETH) : "0"} ETH
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No assets deposited yet. Please complete your deposit to continue setting up your legacy plan.</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                className="glass"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
              <Button
                className="green-glow"
                onClick={() => hasDeposits && setCurrentTab("beneficiaries")}
                disabled={!hasDeposits}
              >
                Continue to Beneficiaries
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="beneficiaries">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Beneficiary Configuration</CardTitle>
              <CardDescription>
                Step 2: Add the wallet addresses of your beneficiaries and their allocation percentages.
                The total allocation must equal 100%.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {hasBeneficiaries ? (
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center mb-4">
                    <div className="h-6 w-6 bg-green-500 rounded-full mr-2 flex items-center justify-center">
                      <Check className="h-4 w-4 text-black" />
                    </div>
                    <p className="text-sm font-medium">Beneficiaries already configured</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You have already configured {contractBeneficiaryCount?.toString()} beneficiaries for your legacy plan.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Wallet Address</Label>
                      <Input
                        id="address"
                        placeholder="0x..."
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        className="glass"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="percentage">Percentage (%)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="percentage"
                          placeholder="e.g. 25"
                          value={newPercentage}
                          onChange={(e) => setNewPercentage(e.target.value)}
                          className="glass"
                        />
                        <Button 
                          onClick={addBeneficiary} 
                          className="glass"
                          disabled={isPending || isWaitingForBeneficiaryReceipt}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">Current Beneficiaries</h3>
                    {beneficiaries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No beneficiaries added yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {beneficiaries.map((b, index) => (
                          <div key={index} className="flex items-center justify-between p-3 neo-blur rounded-md">
                            <div>
                              <p className="text-sm font-medium">{b.address.slice(0, 6)}...{b.address.slice(-4)}</p>
                              <p className="text-xs text-muted-foreground">{b.percentage}% allocation</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeBeneficiary(index)}
                              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        <div className="flex justify-between items-center mt-4 p-2 bg-primary/10 rounded-md">
                          <span className="text-sm font-medium">Total Allocation</span>
                          <span className={`text-sm font-bold ${beneficiaries.reduce((sum, b) => sum + b.percentage, 0) !== 100 ? 'text-red-400' : 'text-green-400'}`}>
                            {beneficiaries.reduce((sum, b) => sum + b.percentage, 0)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                className="glass"
                onClick={() => setCurrentTab("deposit")}
              >
                Back
              </Button>
              {hasBeneficiaries ? (
                <Button
                  className="green-glow"
                  onClick={() => setCurrentTab("trigger")}
                >
                  Continue to Trigger Setup
                </Button>
              ) : (
                <Button
                  onClick={configureBeneficiaries}
                  disabled={
                    beneficiaries.length === 0 || 
                    beneficiaries.reduce((sum, b) => sum + b.percentage, 0) !== 100 || 
                    isPending || 
                    isWaitingForBeneficiaryReceipt
                  }
                  className={beneficiaries.length > 0 && beneficiaries.reduce((sum, b) => sum + b.percentage, 0) === 100 ? "green-glow" : ""}
                >
                  {isPending || isWaitingForBeneficiaryReceipt ? (
                    <>
                      <div className="h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      {isWaitingForBeneficiaryReceipt ? "Confirming..." : "Processing..."}
                    </>
                  ) : (
                    "Save Beneficiaries"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="trigger">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Trigger Setup</CardTitle>
              <CardDescription>
                Step 3: Configure when your digital assets will be distributed to beneficiaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {hasTrigger ? (
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center mb-4">
                    <div className="h-6 w-6 bg-green-500 rounded-full mr-2 flex items-center justify-center">
                      <Check className="h-4 w-4 text-black" />
                    </div>
                    <p className="text-sm font-medium">Trigger already configured</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You have already configured a {Number(contractTrigger?.[0]) === 1 ? "time-based" : "voluntary"} trigger for your legacy plan.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div 
                      className={`glass-card flex flex-col items-center text-center p-6 space-y-4 hover:border-primary/50 transition-all cursor-pointer ${triggerType === 'time' ? 'border-primary/30 green-glow' : ''}`}
                      onClick={() => setTriggerType('time')}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium">Time-Based Trigger</h3>
                      <p className="text-sm text-muted-foreground">
                        Set a specific date when your assets will be automatically distributed to your beneficiaries.
                      </p>
                      <div className="w-full pt-2">
                        <div className={`h-1 w-full rounded-full ${triggerType === 'time' ? 'bg-primary/50' : 'bg-white/10'}`}></div>
                      </div>
                    </div>
                    
                    <div 
                      className={`glass-card flex flex-col items-center text-center p-6 space-y-4 hover:border-primary/50 transition-all cursor-pointer ${triggerType === 'voluntary' ? 'border-primary/30 green-glow' : ''}`}
                      onClick={() => setTriggerType('voluntary')}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium">Voluntary Trigger</h3>
                      <p className="text-sm text-muted-foreground">
                        Manually activate the distribution whenever you decide the time is right.
                      </p>
                      <div className="w-full pt-2">
                        <div className={`h-1 w-full rounded-full ${triggerType === 'voluntary' ? 'bg-primary/50' : 'bg-white/10'}`}></div>
                      </div>
                    </div>
                  </div>

                  {triggerType === 'time' && (
                    <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="triggerDate">Select Trigger Date</Label>
                          <Input
                            type="date"
                            id="triggerDate"
                            className="glass mt-2"
                            value={triggerDate}
                            onChange={(e) => setTriggerDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="flex items-center p-2 bg-primary/10 rounded-md">
                          <AlertTriangle className="h-4 w-4 text-yellow-400 mr-2" />
                          <p className="text-xs">
                            Once the selected date is reached, the smart contract will automatically distribute your assets to the configured beneficiaries.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {triggerType === 'voluntary' && (
                    <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                      <div className="flex items-center p-2 bg-primary/10 rounded-md">
                        <AlertTriangle className="h-4 w-4 text-yellow-400 mr-2" />
                        <p className="text-xs">
                          With a voluntary trigger, you will need to manually activate the distribution when you're ready.
                          You can do this anytime from the Legacy Status page.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                className="glass"
                onClick={() => setCurrentTab("beneficiaries")}
              >
                Back
              </Button>
              {hasTrigger ? (
                <Button
                  className="green-glow"
                  onClick={() => navigate('/status')}
                >
                  View Legacy Status
                </Button>
              ) : (
                <Button
                  onClick={setTrigger}
                  className="green-glow"
                  disabled={
                    isPending || 
                    isWaitingForTriggerReceipt || 
                    (triggerType === 'time' && !triggerDate)
                  }
                >
                  {isPending || isWaitingForTriggerReceipt ? (
                    <>
                      <div className="h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      {isWaitingForTriggerReceipt ? "Confirming..." : "Processing..."}
                    </>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
