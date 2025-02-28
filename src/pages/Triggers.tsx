
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAccount, useContractRead, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Clock, Calendar, AlertTriangle, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { HERITAGE_CHAIN_FACTORY_ABI, HERITAGE_CHAIN_ABI, HERITAGE_CHAIN_FACTORY_ADDRESS } from "@/config/web3";
import { useNavigate } from "react-router-dom";
import { formatDistance } from "date-fns";

export default function Triggers() {
  const { isConnected, address, chain } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedTrigger, setSelectedTrigger] = useState<"time" | "voluntary">("voluntary");
  const [triggerDate, setTriggerDate] = useState<string>("");
  const [triggerTime, setTriggerTime] = useState<string>("12:00");
  const [currentTriggerType, setCurrentTriggerType] = useState<string>("NONE");
  const [triggerActivated, setTriggerActivated] = useState<boolean>(false);
  const [triggerTimestamp, setTriggerTimestamp] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
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
  
  // Wait for transaction receipt
  const { data: receipt, isLoading: isWaitingForReceipt } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: !!txHash
    }
  });

  // Read contract data - Trigger info
  const { data: triggerData, refetch: refetchTrigger } = useContractRead({
    address: heritageChainAddress as `0x${string}` | undefined,
    abi: HERITAGE_CHAIN_ABI,
    functionName: 'trigger',
    query: {
      enabled: !!heritageChainAddress && heritageChainAddress !== "0x0000000000000000000000000000000000000000"
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
      
      // Refetch contract data
      refetchTrigger();
      
      toast({
        title: "Transaction Confirmed",
        description: selectedTrigger === "time" 
          ? "Your time-based trigger has been successfully set." 
          : "Your voluntary trigger has been successfully set.",
      });
      
      // Navigate to status page after successful transaction
      navigate('/status');
    }
  }, [receipt, refetchTrigger, selectedTrigger, navigate, toast]);

  // Update state based on contract data
  useEffect(() => {
    if (triggerData) {
      // triggerType is an enum: 0=NONE, 1=TIME_BASED, 2=VOLUNTARY
      const triggerTypeMap = ["NONE", "TIME_BASED", "VOLUNTARY"];
      setCurrentTriggerType(triggerTypeMap[Number(triggerData[0])]);
      setTriggerTimestamp(Number(triggerData[1]));
      setTriggerActivated(triggerData[2]);
      
      // If trigger is time-based, set the date and time inputs
      if (Number(triggerData[0]) === 1 && Number(triggerData[1]) > 0) {
        const triggerDate = new Date(Number(triggerData[1]) * 1000);
        const dateString = triggerDate.toISOString().split('T')[0];
        const hours = triggerDate.getHours().toString().padStart(2, '0');
        const minutes = triggerDate.getMinutes().toString().padStart(2, '0');
        
        setTriggerDate(dateString);
        setTriggerTime(`${hours}:${minutes}`);
      }
    }
  }, [triggerData]);

  // Set default trigger date to 30 days from now
  useEffect(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    setTriggerDate(thirtyDaysFromNow.toISOString().split('T')[0]);
  }, []);

  const handleSetTrigger = () => {
    if (!heritageChainAddress || !address || !chain || heritageChainAddress === "0x0000000000000000000000000000000000000000") {
      toast({
        title: "Error",
        description: "Missing contract address or wallet connection.",
        variant: "destructive",
      });
      return;
    }

    if (currentTriggerType !== "NONE" && !triggerActivated) {
      toast({
        title: "Trigger Already Set",
        description: "A trigger has already been configured for this legacy plan.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Setting Trigger",
      description: selectedTrigger === "time" 
        ? "Submitting transaction to set time-based trigger..." 
        : "Submitting transaction to set voluntary trigger...",
    });

    try {
      if (selectedTrigger === "time") {
        // Parse the date and time strings to create a timestamp
        const [year, month, day] = triggerDate.split('-').map(Number);
        const [hours, minutes] = triggerTime.split(':').map(Number);
        
        const triggerDateTime = new Date(year, month - 1, day, hours, minutes);
        const triggerTimestamp = Math.floor(triggerDateTime.getTime() / 1000);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        if (isNaN(triggerTimestamp) || triggerTimestamp <= currentTimestamp) {
          toast({
            title: "Invalid Date/Time",
            description: "Please select a date and time in the future.",
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
            setTxHash(hash);
            toast({
              title: "Transaction Submitted",
              description: `Setting time-based trigger for ${triggerDateTime.toLocaleString()}`,
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
            setTxHash(hash);
            toast({
              title: "Transaction Submitted",
              description: "Setting voluntary trigger. You'll be able to activate it manually when ready.",
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

  const viewTriggerStatus = () => {
    navigate('/status');
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
              Please connect your wallet to configure triggers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isFactoryError || !heritageChainAddress || heritageChainAddress === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Card className="glass-card w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>No Legacy Plan Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You haven't created a legacy plan yet. Please create one from the dashboard.
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
        <h2 className="text-3xl font-bold tracking-tight">Triggers</h2>
        {currentTriggerType !== "NONE" && (
          <Button 
            className="neo-blur green-glow bg-black/50 hover:bg-black/70"
            onClick={viewTriggerStatus}
          >
            <Clock className="mr-2 h-4 w-4" /> View Trigger Status
          </Button>
        )}
      </div>

      {currentTriggerType === "NONE" ? (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Set Trigger</CardTitle>
            <CardDescription>
              Configure when your digital assets will be distributed to beneficiaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div 
                className={`glass-card flex flex-col items-center text-center p-6 space-y-4 hover:border-primary/50 transition-all cursor-pointer ${selectedTrigger === 'time' ? 'border-primary/30 green-glow' : ''}`}
                onClick={() => setSelectedTrigger('time')}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium">Time-Based Trigger</h3>
                <p className="text-sm text-muted-foreground">
                  Set a specific date when your assets will be automatically distributed to your beneficiaries.
                </p>
                <div className="w-full pt-2">
                  <div className={`h-1 w-full rounded-full ${selectedTrigger === 'time' ? 'bg-primary/50' : 'bg-white/10'}`}></div>
                </div>
              </div>
              
              <div 
                className={`glass-card flex flex-col items-center text-center p-6 space-y-4 hover:border-primary/50 transition-all cursor-pointer ${selectedTrigger === 'voluntary' ? 'border-primary/30 green-glow' : ''}`}
                onClick={() => setSelectedTrigger('voluntary')}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium">Voluntary Trigger</h3>
                <p className="text-sm text-muted-foreground">
                  Manually activate the distribution whenever you decide the time is right.
                </p>
                <div className="w-full pt-2">
                  <div className={`h-1 w-full rounded-full ${selectedTrigger === 'voluntary' ? 'bg-primary/50' : 'bg-white/10'}`}></div>
                </div>
              </div>
            </div>

            {selectedTrigger === 'time' && (
              <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="triggerDate">Select Date</Label>
                      <Input
                        type="date"
                        id="triggerDate"
                        className="glass mt-2"
                        value={triggerDate}
                        onChange={(e) => setTriggerDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label htmlFor="triggerTime">Select Time</Label>
                      <Input
                        type="time"
                        id="triggerTime"
                        className="glass mt-2"
                        value={triggerTime}
                        onChange={(e) => setTriggerTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center p-2 bg-primary/10 rounded-md mt-4">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 mr-2" />
                    <p className="text-xs">
                      Once the selected date and time is reached, the smart contract will automatically distribute your assets to the configured beneficiaries.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedTrigger === 'voluntary' && (
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
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSetTrigger}
              className="w-full neo-blur green-glow bg-black/50 hover:bg-black/70"
              disabled={isPending || isWaitingForReceipt}
            >
              {isPending || isWaitingForReceipt ? (
                <>
                  <div className="h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  {isWaitingForReceipt ? "Confirming..." : "Processing..."}
                </>
              ) : (
                "Set Trigger"
              )}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Trigger Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center space-y-4 p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                {currentTriggerType === "TIME_BASED" ? (
                  <Calendar className="h-8 w-8 text-primary" />
                ) : (
                  <Check className="h-8 w-8 text-primary" />
                )}
              </div>
              <h3 className="text-xl font-medium">
                {currentTriggerType === "TIME_BASED" ? "Time-Based Trigger" : "Voluntary Trigger"}
              </h3>
              <div className="text-muted-foreground">
                {currentTriggerType === "TIME_BASED" ? (
                  triggerTimestamp ? (
                    <>
                      <p className="font-medium">Scheduled for: {new Date(triggerTimestamp * 1000).toLocaleDateString()}</p>
                      <p className="text-sm mt-1">Time: {new Date(triggerTimestamp * 1000).toLocaleTimeString()}</p>
                      <p className="text-sm mt-2">
                        {triggerActivated 
                          ? "Trigger has been activated" 
                          : `Distribution will occur ${formatDistance(new Date(triggerTimestamp * 1000), new Date(), { addSuffix: true })}`}
                      </p>
                    </>
                  ) : (
                    <p>Time-based trigger configured</p>
                  )
                ) : (
                  <p>
                    {triggerActivated 
                      ? "Trigger has been activated" 
                      : "You can manually activate this trigger from the Legacy Status page"}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              onClick={viewTriggerStatus}
              className="neo-blur green-glow bg-black/50 hover:bg-black/70"
            >
              View Trigger Status
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
