import { useEffect, useState } from 'react';
import DefaultLayout from '@/components/DefaultLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, useNavigate } from 'react-router-dom';
import { getHackathonById } from '@/api/hackathonApi'; 
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { MapPin, Users, User, Clock, Code, Mail, Phone, Hash, ArrowLeft, ClipboardList, Award } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge'; 


// --- Helper Components (Full code included for completeness) ---

const ManagementCard = ({ title, count, icon: Icon, color }) => (
    <Card className={`shadow-lg border-l-4 ${color}`}>
        <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-3xl font-bold text-gray-800">{count}</p>
            </div>
            <Icon className={`w-8 h-8 text-${color.split('-')[1]}-500`} />
        </CardContent>
    </Card>
);

const UserDetailCard = ({ user }) => (
    <Card className="p-3 shadow-sm border">
        <div className="flex justify-between items-center">
            <div className="space-y-0.5">
                <p className="font-semibold text-gray-800">{user.user_name}</p>
                <div className="flex items-center text-sm text-gray-600 space-x-2">
                    <Mail className="w-3 h-3" />
                    <a href={`mailto:${user.user_email}`} className="hover:underline">{user.user_email}</a>
                </div>
                {user.user_phoneno && (
                    <div className="flex items-center text-sm text-gray-600 space-x-2">
                        <Phone className="w-3 h-3" />
                        <span>{user.user_phoneno}</span>
                    </div>
                )}
            </div>
            <div className="text-xs font-medium text-right">
                <span className={`px-2 py-0.5 rounded-full capitalize ${
                    user.role_name === 'coordinator' ? 'bg-indigo-100 text-indigo-800' : 
                    user.role_name === 'evaluator' ? 'bg-red-100 text-red-800' : 
                    'bg-green-100 text-green-800'
                }`}>
                    {user.role_name}
                </span>
                {user.team_name && <p className="text-xs text-gray-500 mt-1">Team: {user.team_name}</p>}
            </div>
        </div>
    </Card>
);

const TeamDetailCard = ({ team }) => (
    <Card className="p-4 shadow-sm border border-blue-200 bg-blue-50/50">
        <div className="space-y-3">
            <div className="flex justify-between items-start">
                <p className="font-bold text-lg text-blue-800">{team.team_name}</p>
                <Badge variant="outline" className="text-sm flex items-center gap-1">
                    <Hash className="w-3 h-3" /> {team._id.slice(-4)}
                </Badge>
            </div>
            <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Members ({team.members.length}):</p>
                <div className="flex flex-wrap gap-2">
                    {team.members.map(member => (
                        <span key={member._id} className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                            {member.user_name}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    </Card>
);



// --- Main Component ---
const HackathonManagement = () => {
    const { hackathonId } = useParams();
    const navigate = useNavigate();
    const [hackathonData, setHackathonData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchHackathonDetails = async () => {
        if (!loading) setLoading(true);
        try {
            const data = await getHackathonById(hackathonId);
            setHackathonData(data);
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch management details.", variant: "destructive" });
            navigate('/admin/view-hackathon'); 
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHackathonDetails();
    }, [hackathonId]);

    if (loading || !hackathonData) {
        return <DefaultLayout userRole="admin"><Skeleton className="h-[600px] m-8" /></DefaultLayout>;
    }
    
    // --- ⬇️ FIXED: Using correct property names from the backend response ---
    const { hackathon_name, start_datetime, end_datetime, mid_submission_datetime, venue, status, counts, managementLists, winners } = hackathonData;
    const { coordinators, evaluators, participants, teams } = managementLists;

    return (
        <DefaultLayout userRole="admin">
            <div className="p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <Button onClick={() => navigate('/admin/view-hackathon')} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to List</Button>
                    <h1 className="text-4xl font-extrabold text-gray-800">Hackathon Management</h1>
                </div>

                <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold text-blue-700">{hackathon_name}</CardTitle>
                        <CardDescription className="text-lg">Status: <span className={`font-semibold capitalize ${status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>{status}</span></CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-green-600" /> Start: {format(new Date(start_datetime), 'MMM d, yyyy @ h:mm a')}</p>
                            <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-600" /> Mid-Review: {mid_submission_datetime ? format(new Date(mid_submission_datetime), 'MMM d, yyyy @ h:mm a') : 'Not Set'}</p>
                            <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-red-600" /> End: {format(new Date(end_datetime), 'MMM d, yyyy @ h:mm a')}</p>
                            <p className="flex items-center gap-2 col-span-full md:col-span-1"><MapPin className="w-4 h-4" /> Venue: {venue}</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <ManagementCard title="Participants" count={counts?.participants || 0} icon={User} color="border-yellow-500" />
                    <ManagementCard title="Teams" count={counts?.teams || 0} icon={Code} color="border-blue-500" />
                    <ManagementCard title="Coordinators" count={counts?.coordinators || 0} icon={Users} color="border-indigo-500" />
                    <ManagementCard title="Evaluators" count={counts?.evaluators || 0} icon={ClipboardList} color="border-red-500" />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader><CardTitle>Registered Staff & Teams</CardTitle></CardHeader>
                            <CardContent>
                                <Accordion type="multiple" className="w-full">
                                    <AccordionItem value="coordinators">
                                        <AccordionTrigger>Coordinators ({counts?.coordinators || 0})</AccordionTrigger>
                                        <AccordionContent className="p-4 grid md:grid-cols-2 gap-4">{coordinators?.length > 0 ? coordinators.map(user => <UserDetailCard key={user._id} user={user} />) : <p>No coordinators.</p>}</AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="teams">
                                        <AccordionTrigger>Teams ({counts?.teams || 0})</AccordionTrigger>
                                        <AccordionContent className="p-4 grid md:grid-cols-2 gap-4">{teams?.length > 0 ? teams.map(team => <TeamDetailCard key={team._id} team={team} />) : <p>No teams.</p>}</AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="evaluators">
                                        <AccordionTrigger>Evaluators ({counts?.evaluators || 0})</AccordionTrigger>
                                        <AccordionContent className="p-4 grid md:grid-cols-2 gap-4">{evaluators?.length > 0 ? evaluators.map(user => <UserDetailCard key={user._id} user={user} />) : <p>No evaluators.</p>}</AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="participants">
                                        <AccordionTrigger>All Participants ({counts?.participants || 0})</AccordionTrigger>
                                        <AccordionContent className="p-4 grid md:grid-cols-2 gap-4">{participants?.length > 0 ? participants.map(user => <UserDetailCard key={user._id} user={user} />) : <p>No participants.</p>}</AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="text-xl">Actions</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <Button onClick={() => navigate(`/admin/manage-hackathon/${hackathonId}/role-mapping`)} className="w-full justify-start"><User className="w-4 h-4 mr-2" /> Assign Staff</Button>
                                <Button onClick={() => navigate(`/admin/hackathon/${hackathonId}/questions`)} className="w-full justify-start"><ClipboardList className="w-4 h-4 mr-2" /> Manage Questions</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DefaultLayout>
    );
};

export default HackathonManagement;