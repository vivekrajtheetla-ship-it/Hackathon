import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DefaultLayout from '@/components/DefaultLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, User, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllUsers, updateUserRole } from '@/api/userApi'; 
import { getHackathonById } from '@/api/hackathonApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input'; 
import { Label } from '@/components/ui/label';

const UserListBox = ({ users, selected, setSelected }) => (
    <div className="border rounded-md h-80 overflow-y-auto bg-gray-50/70 p-2 shadow-inner">
        {users.length === 0 ? (
            <p className="text-center text-gray-500 py-4 text-sm">No users to display.</p>
        ) : (
            users.map(user => (
                <div
                    key={user._id}
                    className={`p-2 cursor-pointer rounded-md mb-1 text-sm transition-all ${
                        selected.includes(user._id) 
                        ? 'bg-blue-200 border border-blue-500' 
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => {
                        setSelected(prev => 
                            prev.includes(user._id)
                                ? prev.filter(id => id !== user._id)
                                : [...prev, user._id]
                        );
                    }}
                >
                    <p className="font-medium">{user.user_name}</p>
                    <p className="text-xs text-gray-600">{user.user_email}</p>
                </div>
            ))
        )}
    </div>
);

const RoleMapping = () => {
    const { hackathonId } = useParams();
    const navigate = useNavigate();
    const [allUsers, setAllUsers] = useState([]); 
    const [hackathon, setHackathon] = useState(null);
    const [targetRole, setTargetRole] = useState('coordinator'); 
    const [loading, setLoading] = useState(true);
    const [selectedAvailable, setSelectedAvailable] = useState([]);
    const [selectedAssigned, setSelectedAssigned] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); 
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersData, hackathonData] = await Promise.all([
                    getAllUsers(), 
                    getHackathonById(hackathonId)
                ]);
                setAllUsers(usersData); 
                setHackathon(hackathonData);
            } catch (error) {
                toast({ title: "Error", description: "Failed to load initial data.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [hackathonId, toast]);

    const handleAssign = async () => {
        if (selectedAvailable.length === 0) return;
        const promises = selectedAvailable.map(userId => 
            updateUserRole(userId, { role: targetRole, current_hackathon: hackathonId })
        );
        try {
            await Promise.all(promises);
            const updatedUsers = allUsers.map(u => selectedAvailable.includes(u._id) ? { ...u, role_name: targetRole } : u);
            setAllUsers(updatedUsers);
            setSelectedAvailable([]); 
            toast({ title: "Success", description: `${selectedAvailable.length} user(s) assigned as ${targetRole}.` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to assign one or more users.", variant: "destructive" });
        }
    };

    const handleUnassign = async () => {
        if (selectedAssigned.length === 0) return;
        const promises = selectedAssigned.map(userId =>
            updateUserRole(userId, { role: 'participant', current_hackathon: hackathonId })
        );
        try {
            await Promise.all(promises);
            const updatedUsers = allUsers.map(u => selectedAssigned.includes(u._id) ? { ...u, role_name: 'participant' } : u);
            setAllUsers(updatedUsers);
            setSelectedAssigned([]); 
            toast({ title: "Success", description: `${selectedAssigned.length} user(s) unassigned.` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to unassign one or more users.", variant: "destructive" });
        }
    };

    const availableUsers = allUsers.filter(user => 
        user.role_name === 'participant' && user.current_hackathon?._id === hackathonId
    );
    
    const assignedUsers = allUsers.filter(user => 
        user.role_name === targetRole && user.current_hackathon?._id === hackathonId
    );
    
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filteredAvailableUsers = availableUsers.filter(u => u.user_name.toLowerCase().includes(lowerCaseSearchTerm) || u.user_email.toLowerCase().includes(lowerCaseSearchTerm));
    const filteredAssignedUsers = assignedUsers.filter(u => u.user_name.toLowerCase().includes(lowerCaseSearchTerm) || u.user_email.toLowerCase().includes(lowerCaseSearchTerm));

    if (loading) {
        return <DefaultLayout userRole="admin"><Skeleton className="h-[600px] m-8" /></DefaultLayout>;
    }
    
    return (
        <DefaultLayout userRole="admin">
            <div className="p-8 max-w-7xl mx-auto space-y-8">
                <Button onClick={() => navigate(`/admin/manage-hackathon/${hackathonId}`)} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Management
                </Button>
                <h1 className="text-4xl font-extrabold text-gray-800 border-b pb-2">
                    Staff Role Mapping for "{hackathon?.hackathon_name}"
                </h1>

                <Card className="shadow-lg">
                    <CardContent className="p-6">
                        <Label>Select Target Role to Assign</Label>
                        <Select onValueChange={setTargetRole} value={targetRole}>
                            <SelectTrigger className="w-full md:w-1/3 mt-1"><SelectValue placeholder="Select Role" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="coordinator">Coordinator</SelectItem>
                                <SelectItem value="evaluator">Evaluator</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card className="shadow-lg">
                    <CardContent className="p-6">
                        <Label htmlFor="search-user">Search User by Name or Email</Label>
                        <Input id="search-user" placeholder="Start typing to filter users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                    <div className="space-y-3">
                        <h3 className="text-xl font-semibold flex items-center gap-2 text-green-700"><User className="w-5 h-5" /> Participants in Hackathon</h3>
                        <p className="text-sm text-gray-500">Users who have joined this hackathon and can be promoted.</p>
                        <UserListBox users={filteredAvailableUsers} selected={selectedAvailable} setSelected={setSelectedAvailable} />
                    </div>
                    
                    <div className="flex lg:flex-col justify-center gap-4">
                        <Button onClick={handleAssign} disabled={selectedAvailable.length === 0} className="bg-green-600 hover:bg-green-700">Assign <ArrowRight className="w-4 h-4 ml-2" /></Button>
                        <Button onClick={handleUnassign} disabled={selectedAssigned.length === 0} variant="destructive" className="bg-red-600 hover:bg-red-700"><ArrowLeft className="w-4 h-4 mr-2" /> Unassign</Button>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xl font-semibold flex items-center gap-2 text-indigo-700"><UserCheck className="w-5 h-5" /> Assigned {targetRole}s</h3>
                        <p className="text-sm text-gray-500">Users assigned as {targetRole} for this event.</p>
                        <UserListBox users={filteredAssignedUsers} selected={selectedAssigned} setSelected={setSelectedAssigned} />
                    </div>
                </div>
            </div>
        </DefaultLayout>
    );
};

export default RoleMapping;