import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { UserPlus, ArrowLeft } from 'lucide-react'

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  role: z.enum(['admin', 'coordinator', 'participant', 'evaluator'], {
    required_error: 'Please select a role'
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

const Register = () => {
  const navigate = useNavigate()
  
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      role: ''
    }
  })

  const onSubmit = (data) => {
    // Mock registration logic - route to appropriate dashboard
    const roleRoutes = {
      admin: '/admin',
      coordinator: '/coordinator',
      participant: '/participant',
      evaluator: '/evaluator'
    }
    
    // Simulate registration success
    navigate(roleRoutes[data.role])
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md relative z-10"
      >
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-xl">
            <CardHeader className="space-y-1 text-center pb-6">
              <motion.div 
                className="flex justify-center mb-6"
                whileHover={{ scale: 1.05, rotate: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className="relative p-4 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg">
                  <UserPlus className="w-8 h-8 text-white" />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl blur-xl opacity-50" />
                </div>
              </motion.div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-600 bg-clip-text text-transparent">
                Create Account
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                Join the hackathon portal community
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">Email Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your email"
                            type="email"
                            className="h-11 bg-white/70 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">Password</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Create a password"
                            type="password"
                            className="h-11 bg-white/70 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Confirm your password"
                            type="password"
                            className="h-11 bg-white/70 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 bg-white/70 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20">
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="coordinator">Coordinator</SelectItem>
                            <SelectItem value="participant">Participant</SelectItem>
                            <SelectItem value="evaluator">Evaluator</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25 transition-all duration-200 mt-6"
                      size="lg"
                    >
                      Create Account
                    </Button>
                  </motion.div>
                </form>
              </Form>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <motion.button
                    onClick={() => navigate('/login')}
                    className="text-purple-600 hover:text-purple-500 font-semibold transition-colors duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign in here
                  </motion.button>
                </p>
              </div>

              <div className="mt-6 text-center">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/')}
                    className="text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Register