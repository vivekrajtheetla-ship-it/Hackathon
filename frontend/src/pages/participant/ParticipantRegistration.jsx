import { useEffect, useState } from 'react';
import DefaultLayout from '@/components/DefaultLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getAllHackathons, joinHackathon } from '@/api/hackathonApi'; // Ensure joinHackathon is imported
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, XCircle, Clock, AlertTriangle, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { getRegistrationStatus, getTimeUntilRegistrationDeadline } from '@/utils/hackathonUtils';

const ParticipantRegistration = ({ onRegistrationSuccess }) => {
    const [availableHackathons, setAvailableHackathons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joiningHackathon, setJoiningHackathon] = useState(null); // State to track which hackathon is being joined
    const { toast } = useToast();
    const userName = localStorage.getItem('userName') || 'Participant';

    useEffect(() => {
        const fetchHackathons = async () => {
            try {
                const data = await getAllHackathons();
                setAvailableHackathons(data || []);
            } catch (error) {
                toast({ title: "Error", description: "Failed to load hackathon data.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchHackathons();
    }, [toast]);

    // 🛑 FIX IS HERE: Implement robust error handling and success redirect
    const handleJoin = async (hackathonId) => {
        setJoiningHackathon(hackathonId);
        try {
            const response = await joinHackathon(hackathonId);
            
            // On successful registration (200 OK):
            toast({ 
                title: "Success!", 
                description: response.message || "You have successfully registered for the hackathon.",
            });

            // Store the ID of the newly joined hackathon
            localStorage.setItem("currentHackathonId", hackathonId);
            
            // Call the parent component's success handler to switch the view to the dashboard
            onRegistrationSuccess();

        } catch (error) {
            console.error('Registration failed:', error);
            const errorMessage = error.response?.data?.message || "Failed to join hackathon due to a server error.";
            toast({ 
                title: "Registration Failed", 
                description: errorMessage, 
                variant: "destructive" 
            });
        } finally {
            setJoiningHackathon(null);
        }
    };

    // --- Component JSX (Keep the existing return structure) ---

    return (
        <DefaultLayout>
            {/* ... (Existing JSX for the header, loading state, and no-hackathon message) ... */}
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                        Hello, {userName}!
                    </h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        Select an active or upcoming hackathon below to join and get started.
                    </p>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : availableHackathons.length === 0 ? (
                    <div className="flex items-center justify-center p-12 bg-gray-50 rounded-lg border border-dashed text-center">
                        <XCircle className="w-6 h-6 mr-3 text-red-500" />
                        <p className="text-lg text-gray-700 font-medium">
                            There are no active or upcoming hackathons to join right now.
                            Please check back later or contact your administrator for more information.
                        </p>
                    </div>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Available Hackathons</CardTitle>
                            <CardDescription>Click 'Join Hackathon' to register for an event.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {availableHackathons.map((hackathon) => {
                                const registrationStatus = getRegistrationStatus(hackathon);
                                const timeRemaining = getTimeUntilRegistrationDeadline(hackathon.registrationDeadline);

                                return (
                                    <div key={hackathon._id} className="flex flex-col md:flex-row items-start md:items-center justify-between border-b pb-4 last:border-b-0 last:pb-0">
                                        <div>
                                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                                {hackathon.hackathon_name}
                                                <Badge variant={hackathon.status === 'active' ? 'default' : 'secondary'}>
                                                    {hackathon.status.toUpperCase()}
                                                </Badge>
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                <Clock className="w-4 h-4 mr-1.5 inline-block" />
                                                Starts: {format(new Date(hackathon.start_datetime), 'MMM d, yyyy h:mm a')} | Ends: {format(new Date(hackathon.end_datetime), 'MMM d, yyyy h:mm a')}
                                            </p>
                                            {hackathon.registrationDeadline && (
                                                <p className="text-sm text-orange-600 flex items-center gap-2 mt-1">
                                                    <AlertTriangle className="w-4 h-4" /> Registration Deadline: {format(new Date(hackathon.registrationDeadline), 'MMM d, yyyy h:mm a')}
                                                    {timeRemaining && <span className="ml-2 font-semibold">({timeRemaining})</span>}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            size="lg"
                                            className="mt-4 md:mt-0 w-full md:w-auto"
                                            onClick={() => handleJoin(hackathon._id)}
                                            disabled={!registrationStatus.canJoin || joiningHackathon === hackathon._id}
                                        >
                                            {joiningHackathon === hackathon._id ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Joining...
                                                </>
                                            ) : registrationStatus.canJoin ? (
                                                <>
                                                    Join Hackathon
                                                    <ArrowRight className="w-5 h-5 ml-2" />
                                                </>
                                            ) : (
                                                'Registration Closed'
                                            )}
                                        </Button>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}
            </div>
        </DefaultLayout>
    );
};

export default ParticipantRegistration;