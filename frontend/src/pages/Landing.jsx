import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
// NOTE: Removed unused component imports: Card, CardContent, CardHeader, CardTitle, Badge
import {
    Code,
    Users,
    Trophy,
    Zap,
    ArrowRight,
    Sparkles,
    Target,
    Shield,
    Crown,
    Mail, 
    Rss, 
    Info, 
    MessageCircle, // New icon for community
    Globe, // New icon for global reach
    BarChart, // New icon for analytics
} from "lucide-react";

// ====================================================================
// FOOTER COMPONENT
// ====================================================================

const AppFooter = () => {
    const navigate = useNavigate();

    const footerLinks = [
        {
            title: "Platform",
            links: [
                { name: "Features", href: "/#features" },
                { name: "Pricing", href: "/pricing" },
                { name: "Sign Up", href: "/register" },
                { name: "Login", href: "/login" },
            ],
        },
        {
            title: "Company",
            links: [
                { name: "About Us", href: "/about" },
                { name: "Contact", href: "/contact" },
                { name: "Careers", href: "/careers" },
                { name: "Blog", href: "/blog" },
            ],
        },
        {
            title: "Legal",
            links: [
                { name: "Terms of Service", href: "/terms" },
                { name: "Privacy Policy", href: "/privacy" },
                { name: "Security", href: "/security" },
                { name: "Sitemap", href: "/sitemap" },
            ],
        },
    ];

    const socialLinks = [
        { icon: Code, name: "GitHub", href: "#" }, 
        { icon: Users, name: "LinkedIn", href: "#" }, 
        { icon: Trophy, name: "Twitter", href: "#" }, 
    ];

    return (
        <footer className="w-full border-t border-white/10 mt-20 pt-12 pb-8 bg-black/50 backdrop-blur-md">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-10 border-b border-white/5 pb-10 mb-8">
                    
                    <div className="col-span-2 md:col-span-2">
                        <div className="flex items-center mb-4">
                            <h4 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                                HackaFlow
                            </h4>
                        </div>
                        <p className="text-gray-400 max-w-sm text-base leading-relaxed">
                            The comprehensive platform for managing hackathons that ignite innovation and recognize true talent.
                        </p>
                        <div className="flex space-x-4 mt-6">
                            {socialLinks.map((social) => (
                                <motion.a
                                    key={social.name}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors duration-200 group"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <social.icon className="w-5 h-5 text-gray-400 group-hover:text-white" />
                                </motion.a>
                            ))}
                        </div>
                    </div>

                    {footerLinks.map((group) => (
                        <div key={group.title} className="col-span-1">
                            <h5 className="text-lg font-semibold text-white mb-4 border-l-2 border-indigo-500 pl-3">
                                {group.title}
                            </h5>
                            <ul className="space-y-3">
                                {group.links.map((link) => (
                                    <li key={link.name}>
                                        <a
                                            href={link.href}
                                            className="text-gray-400 hover:text-indigo-400 transition-colors text-base"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                navigate(link.href);
                                            }}
                                        >
                                            {link.name}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 pt-4">
                    <p className="order-2 md:order-1 mt-4 md:mt-0">
                        &copy; {new Date().getFullYear()} HackaFlow. All rights reserved.
                    </p>
                    <div className="order-1 md:order-2 flex space-x-6">
                        <a href="/contact" className="hover:text-white transition-colors flex items-center gap-1">
                            <Mail className="w-4 h-4" /> Contact Us
                        </a>
                        <a href="/about" className="hover:text-white transition-colors flex items-center gap-1">
                            <Info className="w-4 h-4" /> About
                        </a>
                        <a href="/blog" className="hover:text-white transition-colors flex items-center gap-1">
                            <Rss className="w-4 h-4" /> Blog
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

// ====================================================================
// COMMENTED OUT: LIVE STATISTICS BAR COMPONENT
// ====================================================================

/*
const LiveStatsBar = () => {
    const stats = [
        { number: '1.2M+', label: 'Lines of Code Submitted', icon: Code, color: 'text-cyan-400' },
        { number: '2,500+', label: 'Active Participants', icon: Users, color: 'text-purple-400' },
        { number: '400+', label: 'Events Hosted', icon: Trophy, color: 'text-yellow-400' },
        { number: '12', label: 'Countries Engaged', icon: Globe, color: 'text-green-400' },
    ];

    return (
        <div className="max-w-6xl mx-auto py-12 px-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl shadow-indigo-500/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        className="text-center relative overflow-hidden"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                    >
                        <div className={`absolute -top-2 -right-2 h-4 w-4 rounded-full ${stat.color.replace('text-', 'bg-')} opacity-25 animate-ping duration-1000`} />
                        
                        <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
                        <div className="text-3xl font-extrabold text-white mb-1">
                            {stat.number}
                        </div>
                        <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                            {stat.label}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
*/

// ====================================================================
// MODIFIED LANDING COMPONENT
// ====================================================================

const Landing = () => {
    const navigate = useNavigate();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                duration: 0.5,
            },
        },
    };

    const itemVariants = {
        hidden: { y: 30, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                duration: 0.6,
                ease: "easeOut",
            },
        },
    };

    // Expanded and updated feature list
    const features = [
        {
            icon: Users,
            title: "Smart Team Formation",
            description: "AI-driven pairing for balanced, efficient team assembly and management.",
            color: "from-blue-400 to-cyan-400",
        },
        {
            icon: Code,
            title: "Git-Integrated Workflow",
            description: "Seamlessly connect repositories for automatic real-time project tracking.",
            color: "from-purple-400 to-pink-400",
        },
        {
            icon: Trophy,
            title: "Transparent Scoring",
            description: "Customizable, bias-free evaluation with detailed metrics and feedback.",
            color: "from-amber-400 to-orange-400",
        },
        {
            icon: BarChart,
            title: "Live Analytics Dashboard",
            description: "Monitor participation, progress, and submissions with real-time data.",
            color: "from-green-400 to-lime-400",
        },
        {
            icon: Shield,
            title: "Secure Access Controls",
            description: "Role-based permissions for Admins, Judges, and Participants ensures security.",
            color: "from-red-400 to-pink-400",
        },
        {
            icon: MessageCircle,
            title: "Built-in Community Chat",
            description: "Foster collaboration and support with integrated team and global chat functionality.",
            color: "from-indigo-400 to-violet-400",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 relative overflow-hidden">
            
            {/* ==================================================================== */}
            {/* LIVE ANIMATION BACKGROUND ELEMENTS (Using built-in utilities) */}
            {/* ==================================================================== */}
            <div className="absolute inset-0">
                {/* Blob 1: Top Left - uses animate-pulse for a simpler effect */}
                <div 
                    className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[120px] opacity-70 animate-pulse duration-[3000ms]" 
                />
                
                {/* Blob 2: Bottom Right - Delayed pulse for contrast */}
                <div
                    className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-[120px] opacity-70 animate-pulse duration-[4000ms] delay-1000"
                />

                {/* Central Subtle Motion Effect (Central, slow ping) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="relative flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400/30 opacity-75 duration-3000" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-400/50" />
                    </span>
                </div>
            </div>
            
            <div className="relative z-10">
                <motion.div
                    className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Hero Section */}
                    <div className="text-center max-w-6xl mx-auto mb-20">
                        <motion.div variants={itemVariants} className="mb-8">
                            
                            <motion.div
                                className="inline-flex items-center mb-6 px-6 py-2.5 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Sparkles className="w-5 h-5 text-yellow-300 mr-2" />
                                <span className="text-sm font-medium text-white/80">The future of competitive coding.</span>
                            </motion.div>

                            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold text-white mb-6 leading-tight">
                                Ignite <span className="block lg:inline-block">Innovation</span>
                                <span className="block lg:inline-block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent ml-3">
                                    Power Hackathons
                                </span>
                            </h1>
                        </motion.div>

                        <motion.p
                            variants={itemVariants}
                            className="text-xl lg:text-2xl text-gray-300 mb-12 leading-relaxed max-w-4xl mx-auto"
                        >
                            A **comprehensive platform** designed to **streamline every phase** of your hackathon—from smart team assembly to fair, transparent evaluation.
                        </motion.p>

                        <motion.div
                            variants={itemVariants}
                            className="flex flex-col sm:flex-row gap-6 justify-center mb-16"
                        >
                            <motion.div
                                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(79, 70, 229, 0.6)" }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button
                                    size="lg"
                                    className="text-lg px-10 py-7 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-xl shadow-blue-500/25 font-semibold transition-all duration-300"
                                    onClick={() => navigate("/login")}
                                >
                                    <Zap className="w-5 h-5 mr-2" />
                                    Launch Your Event
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </motion.div>

                            <motion.div
                                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(255, 255, 255, 0.1)" }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="text-lg px-10 py-7 bg-white/5 text-white border border-white/30 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 font-semibold"
                                    onClick={() => navigate("/register")}
                                >
                                    <Users className="w-5 h-5 mr-2" />
                                    Get Started
                                </Button>
                            </motion.div>
                        </motion.div>
                    </div>
                    
                    {/* COMMENTED OUT: Live Statistics Bar */}
                    {/*
                    <motion.div variants={itemVariants} className="mb-24">
                        <LiveStatsBar />
                    </motion.div>
                    */}

                    {/* Features Grid (Larger Tiles: 3 columns on large screens) */}
                    <motion.div
                        variants={itemVariants}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
                    >
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                whileHover={{ y: -6, scale: 1.02 }}
                                className="group relative transition-transform duration-300"
                            >
                                {/* GLOW EFFECT CONTAINER (Pulse on Hover) */}
                                <div 
                                    className={`absolute inset-0 rounded-2xl p-px opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse-slow`} 
                                    style={{ 
                                        background: `linear-gradient(135deg, 
                                            ${(feature.color?.split(' ')?.[0] || 'from-#3B82F6').replace('from-', '#')} 0%, 
                                            ${(feature.color?.split(' ')?.[2] || 'to-#8B5CF6').replace('to-', '#')} 100%
                                        )`,
                                        filter: 'blur(10px)', 
                                        zIndex: 0,
                                        opacity: 0.5,
                                    }}
                                />
                                
                                {/* Feature Card Content (Bigger padding for larger card look) */}
                                <div className="relative p-8 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 h-full z-10">
                                    <div className="relative z-10">
                                        <div
                                            className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${feature.color} mb-6 shadow-lg shadow-black/30`}
                                        >
                                            <feature.icon className="w-6 h-6 text-white" />
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-3">
                                            {feature.title}
                                        </h3>

                                        <p className="text-gray-400 text-base">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>


                    {/* Call to Action */}
                    <motion.div variants={itemVariants} className="text-center mt-24 lg:mt-32">
                        <div className="max-w-4xl mx-auto p-12 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 rounded-3xl backdrop-blur-sm border border-white/10 shadow-2xl shadow-indigo-500/10">
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">
                                Ready to Host Your Next Breakthrough Event?
                            </h2>
                            <p className="text-gray-300 text-lg mb-10 max-w-2xl mx-auto">
                                Join the global community powering innovation. Start managing your hackathon in minutes.
                            </p>
                            <motion.div
                                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(16, 185, 129, 0.5)" }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button
                                    size="lg"
                                    className="text-lg px-12 py-7 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white border-0 shadow-2xl shadow-emerald-500/30 font-semibold transition-all duration-300"
                                    onClick={() => navigate("/register")}
                                >
                                    <Crown className="w-5 h-5 mr-2" />
                                    Launch Your Hackathon Now
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>

                <AppFooter />
            </div>
        </div>
    );
};

export default Landing; 