// pages/coordinator/TeamRegistration.jsx

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getTeamById } from '@/api/teamApi';
import { getHackathonById } from '@/api/hackathonApi';
import DefaultLayout from '@/components/DefaultLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Save, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const teamSchema = z.object({
    team_name: z.string().min(1, 'Team name is required.'),
    q_id: z.string().min(1, 'Please select a project for the team.'),
    members: z.array(z.string()).min(1, 'Please select at least one member.').max(4, 'You can select a maximum of 4 members.'),
    user_github_url: z.string().url('A valid GitHub URL is required.'),
});

const UserListBox = ({ users, selected, setSelected, title }) => (
    <div className="space-y-2">
        <h3 className="text-md font-semibold">{title} ({users.length})</h3>
        <div className="border rounded-md h-60 overflow-y-auto bg-gray-50 p-2 shadow-inner">
            {(users || []).map(user => (
                <div key={user._id} className={`p-2 cursor-pointer rounded-md mb-1 text-sm ${selected.includes(user._id) ? 'bg-blue-200' : 'hover:bg-gray-100'}`} onClick={() => setSelected(prev => prev.includes(user._id) ? prev.filter(id => id !== user._id) : [...prev, user._id])}>
                    <p className="font-medium">{user.user_name}</p>
                </div>
            ))}
        </div>
    </div>
);

const TeamRegistration = ({ availableParticipants = [], questions = [], teamId, onSubmitTeam, onFinish }) => {
    const isEditMode = Boolean(teamId);
    const [loading, setLoading] = useState(true);
    const [hackathon, setHackathon] = useState(null);
    const [allQuestions] = useState(questions);
    const [selectedDomain, setSelectedDomain] = useState('');
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [availableMembers, setAvailableMembers] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedFromAvailable, setSelectedFromAvailable] = useState([]);
    const [selectedFromTeam, setSelectedFromTeam] = useState([]);
    const { toast } = useToast();
    const form = useForm({ resolver: zodResolver(teamSchema), defaultValues: { team_name: '', user_github_url: '', q_id: '', members: [] } });

    useEffect(() => {
        const initializeForm = async () => {
            setLoading(true);
            try {
                const hackathonId = localStorage.getItem('currentHackathonId');
                if (hackathonId) setHackathon(await getHackathonById(hackathonId));

                if (isEditMode && teamId) {
                    const teamData = await getTeamById(teamId);
                    form.reset({
                        team_name: teamData.team_name,
                        q_id: teamData.q_id?._id || teamData.q_id,
                        user_github_url: teamData.user_github_url,
                        members: teamData.members.map(m => m._id)
                    });
                    setTeamMembers(teamData.members);
                    const teamMemberIds = new Set(teamData.members.map(m => m._id));
                    setAvailableMembers(availableParticipants.filter(p => !teamMemberIds.has(p._id)));
                } else {
                    form.reset({ team_name: '', user_github_url: '', q_id: '', members: [] });
                    setTeamMembers([]);
                    setAvailableMembers(availableParticipants);
                }
            } catch (err) {
                console.error("ERROR initializing form:", err);
                toast({ title: "Error", description: "Failed to initialize form.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        initializeForm();
    }, [teamId, isEditMode, availableParticipants, questions]);

    useEffect(() => {
        if (selectedDomain && hackathon) {
            const projectsInDomain = allQuestions.filter(q => q.domain === selectedDomain);
            setFilteredProjects(projectsInDomain);
        } else {
            setFilteredProjects(allQuestions);
        }
    }, [selectedDomain, allQuestions, hackathon]);

    useEffect(() => {
        const currentQuestionId = form.getValues('q_id');
        if (currentQuestionId && !filteredProjects.some(p => p._id === currentQuestionId)) {
            form.setValue('q_id', '');
        }
    }, [filteredProjects, form]);
    
    const handleAssign = () => {
        if (teamMembers.length + selectedFromAvailable.length > 4) {
            toast({ title: "Team Full", description: "You cannot add more than 4 members.", variant: "destructive" });
            return;
        }
        const toAssign = availableMembers.filter(m => selectedFromAvailable.includes(m._id));
        setTeamMembers(prev => [...prev, ...toAssign]);
        setAvailableMembers(prev => prev.filter(m => !selectedFromAvailable.includes(m._id)));
        setSelectedFromAvailable([]);
    };

    const handleUnassign = () => {
        const toUnassign = teamMembers.filter(m => selectedFromTeam.includes(m._id));
        setAvailableMembers(prev => [...prev, ...toUnassign]);
        setTeamMembers(prev => prev.filter(m => !selectedFromTeam.includes(m._id)));
        setSelectedFromTeam([]);
    };

    useEffect(() => {
        form.setValue('members', teamMembers.map(m => m._id), { shouldValidate: true });
    }, [teamMembers, form]);

    const uniqueDomains = [...new Set(allQuestions.map(q => q.domain))];
    
    // Check if no questions are available for this hackathon
    const hasNoQuestions = allQuestions.length === 0;

    const onSubmit = async (data) => {
        const payload = { 
            ...data, 
            hackathon_id: localStorage.getItem('currentHackathonId'), 
            coordinator_id: localStorage.getItem('userId') 
        };
        await onSubmitTeam(payload);
    };
    
    if (loading) return <div className="p-8"><Skeleton className="h-96" /></div>;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold flex items-center gap-3"><Users/> {isEditMode ? 'Edit Team' : 'Register New Team'}</CardTitle>
                    <CardDescription>For hackathon: <strong className="text-blue-600">{hackathon?.hackathon_name}</strong></CardDescription>
                </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                <FormField control={form.control} name="team_name" render={({ field }) => ( <FormItem><FormLabel>1. Team Name</FormLabel><FormControl><Input placeholder="e.g., The Code Crusaders" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                {hasNoQuestions ? (
                                    <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Projects Available</h3>
                                        <p className="text-yellow-700 mb-3">
                                            No projects have been assigned to this hackathon yet. Please contact an administrator to:
                                        </p>
                                        <ul className="list-disc list-inside text-sm text-yellow-600 space-y-1">
                                            <li>Create projects in the "Manage Titles" section</li>
                                            <li>Assign projects to this hackathon using "Manage Questions"</li>
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormItem>
                                            <FormLabel>2. Select Project Domain</FormLabel>
                                            <Select onValueChange={setSelectedDomain} value={selectedDomain}><FormControl><SelectTrigger><SelectValue placeholder="Choose a domain..." /></SelectTrigger></FormControl><SelectContent>{uniqueDomains.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
                                        </FormItem>
                                        <FormField control={form.control} name="q_id" render={({ field }) => ( <FormItem><FormLabel>3. Assign Project</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedDomain && filteredProjects.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Select a project..." /></SelectTrigger></FormControl><SelectContent>{filteredProjects.length > 0 ? (filteredProjects.map(p => <SelectItem key={p._id} value={p._id}>{p.q_title}</SelectItem>)) : (<div className="p-4 text-sm text-center text-gray-500">No projects in this domain.</div>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                                    </div>
                                )}
                                <div className="space-y-4">
                                    <Label>4. Assign Members (Team Size: {teamMembers.length} / 4)</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                                        <UserListBox title="Available Participants" users={availableMembers} selected={selectedFromAvailable} setSelected={setSelectedFromAvailable} />
                                        <div className="flex md:flex-col justify-center gap-2">
                                            <Button type="button" size="icon" onClick={handleAssign} disabled={selectedFromAvailable.length === 0}><ArrowRight className="w-4 h-4" /></Button>
                                            <Button type="button" size="icon" onClick={handleUnassign} disabled={selectedFromTeam.length === 0} variant="destructive"><ArrowLeft className="w-4 h-4" /></Button>
                                        </div>
                                        <UserListBox title="Selected Members" users={teamMembers} selected={selectedFromTeam} setSelected={setSelectedFromTeam} />
                                    </div>
                                    <FormMessage>{form.formState.errors.members?.message}</FormMessage>
                                </div>
                                <FormField control={form.control} name="user_github_url" render={({ field }) => ( <FormItem><FormLabel>5. Team GitHub URL</FormLabel><FormControl><Input placeholder="https://github.com/team/repo" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <div className="flex justify-end space-x-4 pt-4">
                                    <Button type="button" variant="outline" onClick={onFinish}>Cancel</Button>
                                    <Button type="submit" disabled={form.formState.isSubmitting || hasNoQuestions}>
                                        <Save className="w-4 h-4 mr-2" /> 
                                        {hasNoQuestions ? "No Projects Available" : 
                                         form.formState.isSubmitting ? (isEditMode ? "Saving..." : "Registering...") : 
                                         (isEditMode ? "Save Changes" : "Register Team")}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
    );
};

export default TeamRegistration;