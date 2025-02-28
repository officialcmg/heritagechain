
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccount, useContractRead, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Users, Plus, Trash2, Percent } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { HERITAGE_CHAIN_ABI, HERITAGE_CHAIN_FACTORY_ABI, HERITAGE_CHAIN_FACTORY_ADDRESS } from "@/config/web3";
import { useNavigate } from "react-router-dom";
import { fetchBeneficiaryData, simulateBeneficiaryData } from "@/utils/beneficiaryUtils";
import type { Beneficiary } from "@/utils/beneficiaryUtils";

export default function Beneficiaries() {
  const { isConnected, address, chain } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [newPercentage, setNewPercentage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
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

  // Wait for transaction receipt
  const { data: receipt, isLoading: isWaitingForReceipt } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: !!txHash
    }
  });

  // Read contract data - Beneficiary count
  const { data: beneficiaryCount, refetch: refetchBeneficiaryCount } = useContractRead({
    address: heritageChainAddress as `0x${string}` | undefined,
    abi: HERITAGE_CHAIN_ABI,
    functionName: 'getBeneficiaryCount',
    query: {
      enabled: !!heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000"
    }
  });

  // Check if plan is distributed
  const { data: isDistributed } = useContractRead({
    address: heritageChainAddress as `0x${string}` | undefined,
    abi: HERITAGE_CHAIN_ABI,
    functionName: 'isDistributed',
    query: {
      enabled: !!heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000"
    }
  });

  // Effect to handle transaction receipt
  useEffect(() => {
    if (receipt) {
      setTxHash(null);
      
      // Refetch contract data after transaction
      refetchBeneficiaryCount();
      loadBeneficiaryData();
      
      toast({
        title: "Transaction Confirmed",
        description: "Your beneficiaries have been successfully updated.",
      });
    }
  }, [receipt, refetchBeneficiaryCount, toast]);

  // Load beneficiary data using the utility function
  const loadBeneficiaryData = async () => {
    try {
      const beneficiaryData = await fetchBeneficiaryData(heritageChainAddress as `0x${string}`, chain);
      
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

  // Fetch beneficiary data when the contract address or count changes
  useEffect(() => {
    loadBeneficiaryData();
  }, [heritageChainAddress, beneficiaryCount, chain]);

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000") {
        refetchBeneficiaryCount();
        loadBeneficiaryData();
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [heritageChainAddress, refetchBeneficiaryCount]);

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

    const newBeneficiaries = [...beneficiaries, { address: newAddress, percentage }];
    setBeneficiaries(newBeneficiaries);
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

  const saveBeneficiaries = () => {
    if (!heritageChainAddress || !address || !chain) {
      toast({
        title: "Error",
        description: "Missing contract address or wallet connection.",
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
        description: `Total allocation must equal 100%. Current total: ${total}%`,
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
          beneficiaries.map(b => BigInt(b.percentage * 100)), // Convert percentage to basis points
        ],
        account: address,
        chain: chain,
      }, {
        onSuccess: (hash) => {
          setTxHash(hash);
          toast({
            title: "Transaction Submitted",
            description: "Your beneficiary configuration is being processed.",
          });
        },
        onError: (error) => {
          console.error("Error configuring beneficiaries:", error);
          toast({
            title: "Save Failed",
            description: "There was an error saving your beneficiaries.",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error("Error configuring beneficiaries:", error);
      toast({
        title: "Save Failed",
        description: "There was an error saving your beneficiaries.",
        variant: "destructive",
      });
    }
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
              Please connect your wallet to manage beneficiaries.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isFactoryError || !heritageChainAddress || heritageChainAddress === "0x0000000000000000000000000000000000000000" || isDistributed) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Card className="glass-card w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>No Legacy Plan Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {isDistributed 
                ? "Your legacy plan has been distributed." 
                : "You haven't created a legacy plan yet. Please create one from the dashboard."}
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
        <h2 className="text-3xl font-bold tracking-tight">Beneficiaries</h2>
        {beneficiaries.length > 0 && !isEditing ? (
          <Button 
            className="neo-blur green-glow bg-black/50 hover:bg-black/70"
            onClick={() => setIsEditing(true)}
          >
            <Users className="mr-2 h-4 w-4" /> Edit Beneficiaries
          </Button>
        ) : beneficiaries.length === 0 ? (
          <Button 
            className="neo-blur green-glow bg-black/50 hover:bg-black/70"
            onClick={() => setIsEditing(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Beneficiary
          </Button>
        ) : null}
      </div>

      {isEditing ? (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{beneficiaries.length === 0 ? "Add Beneficiaries" : "Edit Beneficiaries"}</CardTitle>
            <CardDescription>
              Add or modify the wallet addresses of your beneficiaries and their allocation percentages.
              The total allocation must equal 100%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                    <Button onClick={addBeneficiary} className="glass">Add</Button>
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
                          <Trash2 className="h-4 w-4" />
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
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              className="glass"
              onClick={() => {
                setIsEditing(false);
                // If we were creating new beneficiaries and cancel, reset to empty
                if (beneficiaries.length === 0) {
                  setNewAddress("");
                  setNewPercentage("");
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={saveBeneficiaries}
              disabled={beneficiaries.length === 0 || beneficiaries.reduce((sum, b) => sum + b.percentage, 0) !== 100 || isPending || isWaitingForReceipt}
              className={beneficiaries.length > 0 && beneficiaries.reduce((sum, b) => sum + b.percentage, 0) === 100 ? "green-glow" : ""}
            >
              {isPending || isWaitingForReceipt ? (
                <>
                  <div className="h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  {isWaitingForReceipt ? "Confirming..." : "Processing..."}
                </>
              ) : (
                "Save Beneficiaries"
              )}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Current Beneficiaries</CardTitle>
            <CardDescription>
              These beneficiaries will receive your digital assets according to their allocation percentages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {beneficiaries.length === 0 ? (
              <div className="text-center p-6">
                <div className="flex justify-center items-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Beneficiaries Configured</h3>
                <p className="text-muted-foreground">
                  You haven't added any beneficiaries yet. Click the button above to add your first beneficiary.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {beneficiaries.map((b, index) => (
                  <div key={index} className="flex items-center p-4 neo-blur rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mr-4">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{b.address}</p>
                      <p className="text-xs text-muted-foreground">Beneficiary {index + 1}</p>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <div className="flex items-center">
                        <span className="text-sm font-bold text-primary">{b.percentage}</span>
                        <Percent className="h-3 w-3 text-primary ml-0.5" />
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Allocation Summary</h3>
                  <div className="space-y-2">
                    {beneficiaries.map((b, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-xs font-mono">{b.address.slice(0, 6)}...{b.address.slice(-4)}</span>
                        <span className="text-xs font-bold">{b.percentage}%</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-white/10 flex justify-between">
                      <span className="text-xs font-medium">Total</span>
                      <span className="text-xs font-bold">{beneficiaries.reduce((sum, b) => sum + b.percentage, 0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
