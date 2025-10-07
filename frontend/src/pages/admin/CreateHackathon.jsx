import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createHackathon } from "@/api/hackathonApi";
import DefaultLayout from '@/components/DefaultLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from '@/hooks/use-toast'; 
import { motion } from 'framer-motion';

const CreateHackathon = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        hackathon_name: "",
        venue: "",
        start_datetime: null,
        mid_submission_datetime: null,
        end_datetime: null,
        registrationDeadline: null,
    });
    const [loading, setLoading] = useState(false);

    const handleDateChange = (date, field) => {
        setFormData({ ...formData, [field]: date });
    };
    
    const handleTimeChange = (e, field) => {
        const time = e.target.value;
        if (!time || !formData[field]) return;

        const [hours, minutes] = time.split(':').map(Number);
        const newDate = new Date(formData[field]);
        newDate.setHours(hours, minutes, 0, 0);
        setFormData({ ...formData, [field]: newDate });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (Object.values(formData).some(val => val === null || val === "")) {
            toast({ title: "Validation Error", description: "Please fill in all fields." });
            setLoading(false);
            return;
        }

        try {
            await createHackathon(formData);
            toast({ title: "Success", description: "Hackathon created successfully!" });
            setTimeout(() => navigate('/admin/view-hackathon'), 2000);
        } catch (err) {
            toast({ title: "Error", description: err.response?.data?.message || "Failed to create hackathon." });
        } finally {
            setLoading(false);
        }
    };

    const renderDateTimePicker = (field, label) => (
        <div className="space-y-2">
            <Label htmlFor={field} className="text-sm font-semibold text-gray-700">{label}</Label>
            <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-full sm:w-[240px] justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData[field] ? format(formData[field], "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={formData[field]} onSelect={(date) => handleDateChange(date, field)} initialFocus />
                    </PopoverContent>
                </Popover>
                <div className="relative flex-1">
                    <Input
                        type="time"
                        value={formData[field] ? format(formData[field], "HH:mm") : ""}
                        onChange={(e) => handleTimeChange(e, field)}
                        className="pl-8"
                        disabled={!formData[field]}
                    />
                    <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                </div>
            </div>
        </div>
    );

    return (
        <DefaultLayout userRole="admin">
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full max-w-3xl"
                >
                    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center text-3xl font-bold">
                                <Plus className="w-7 h-7 mr-3 text-blue-600" />
                                Create Hackathon Event
                            </CardTitle>
                            <CardDescription className="text-base">
                                Fill in the details to set up a new hackathon. All fields are required.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="hackathon_name" className="text-sm font-semibold text-gray-700">Hackathon Name</Label>
                                    <Input id="hackathon_name" placeholder="e.g., CodeFest 2024" value={formData.hackathon_name} onChange={(e) => setFormData({ ...formData, hackathon_name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="venue" className="text-sm font-semibold text-gray-700">Venue / Location</Label>
                                    <Input id="venue" placeholder="e.g., Virtual or City Conference Center" value={formData.venue} onChange={(e) => setFormData({ ...formData, venue: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {renderDateTimePicker("start_datetime", "Start Date & Time")}
                                    {renderDateTimePicker("end_datetime", "End Date & Time")}
                                    {renderDateTimePicker("mid_submission_datetime", "Mid-Submission Deadline")}
                                    {renderDateTimePicker("registrationDeadline", "Registration Deadline")}
                                </div>
                                
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? "Creating..." : "Create Hackathon"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </DefaultLayout>
    );
};

export default CreateHackathon;