"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Play, 
  Search, 
  Clock, 
  User, 
  FileText, 
  BarChart3, 
  MessageSquare, 
  Shield, 
  ArrowLeft,
  BookOpen,
  Video,
  CheckCircle,
  Star,
  Zap,
  Mail,
  Phone,
  ExternalLink
} from "lucide-react"

interface Tutorial {
  id: string
  title: string
  description: string
  duration: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  category: string
  videoUrl?: string
  isPopular?: boolean
  steps?: string[]
}

export default function HelpPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null)

  // Tutorial data
  const tutorials: Tutorial[] = [
    {
      id: "getting-started",
      title: "Getting Started with TalksFromTherapy",
      description: "Complete overview of the platform and how to set up your first session",
      duration: "8 min",
      difficulty: "Beginner",
      category: "Getting Started",
      isPopular: true,
      steps: [
        "Create your therapist account",
        "Set up your first patient profile",
        "Upload your first audio session",
        "Navigate the dashboard overview"
      ]
    },
    {
      id: "patient-management",
      title: "Managing Patient Profiles",
      description: "How to create, edit, and organize patient information securely",
      duration: "12 min",
      difficulty: "Beginner",
      category: "Patient Management",
      steps: [
        "Creating new patient profiles",
        "Managing patient information",
        "Understanding privacy controls",
        "Organizing multiple patients"
      ]
    },
    {
      id: "audio-upload",
      title: "Uploading and Transcribing Sessions",
      description: "Step-by-step guide to upload audio and get automated transcriptions",
      duration: "15 min",
      difficulty: "Beginner",
      category: "Audio Processing",
      isPopular: true,
      steps: [
        "Supported audio formats",
        "Upload process walkthrough",
        "Monitoring transcription progress",
        "Editing transcriptions"
      ]
    },
    {
      id: "sentiment-analysis",
      title: "Understanding Sentiment Analysis",
      description: "Deep dive into emotion tracking and sentiment insights",
      duration: "18 min",
      difficulty: "Intermediate",
      category: "Analysis",
      steps: [
        "Reading emotion charts",
        "Understanding sentiment scores",
        "Interpreting emotion trends",
        "Using emotion flowers visualization"
      ]
    },
    {
      id: "therapeutic-notes",
      title: "Taking and Managing Notes",
      description: "Best practices for therapeutic note-taking within sessions",
      duration: "10 min",
      difficulty: "Beginner",
      category: "Documentation",
      steps: [
        "Creating session-specific notes",
        "Organizing notes effectively",
        "Security and encryption",
        "Exporting notes"
      ]
    },
    {
      id: "privacy-security",
      title: "Privacy and Security Features",
      description: "Understanding GDPR compliance and data protection measures",
      duration: "12 min",
      difficulty: "Intermediate",
      category: "Security",
      steps: [
        "Data encryption explained",
        "GDPR compliance features",
        "Patient consent management",
        "Data retention policies"
      ]
    },
    {
      id: "advanced-analysis",
      title: "Advanced Analysis Features",
      description: "Topic modeling, semantic analysis, and multi-session insights",
      duration: "25 min",
      difficulty: "Advanced",
      category: "Analysis",
      steps: [
        "Topic modeling setup",
        "Semantic frame analysis",
        "Multi-session comparisons",
        "Exporting analysis data"
      ]
    }
  ]

  const categories = ["All", "Getting Started", "Patient Management", "Audio Processing", "Analysis", "Documentation", "Security"]

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-green-100 text-green-800"
      case "Intermediate": return "bg-yellow-100 text-yellow-800"
      case "Advanced": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Getting Started": return <BookOpen className="h-4 w-4" />
      case "Patient Management": return <User className="h-4 w-4" />
      case "Audio Processing": return <FileText className="h-4 w-4" />
      case "Analysis": return <BarChart3 className="h-4 w-4" />
      case "Documentation": return <MessageSquare className="h-4 w-4" />
      case "Security": return <Shield className="h-4 w-4" />
      default: return <Video className="h-4 w-4" />
    }
  }

  const filteredTutorials = tutorials.filter(tutorial => {
    const matchesSearch = tutorial.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tutorial.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "All" || tutorial.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    router.push("/login")
    return null
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tutorials</h1>
          <p className="text-gray-600 mt-2">Learn how to make the most of TalksFromTherapy</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="flex items-center p-6">
            <Video className="h-12 w-12 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">{tutorials.length}</p>
              <p className="text-sm text-gray-600">Video Tutorials</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-12 w-12 text-green-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">
                {tutorials.reduce((acc, t) => acc + parseInt(t.duration), 0)} min
              </p>
              <p className="text-sm text-gray-600">Total Content</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tour guidato promo */}
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Tour Guidato Interattivo</h3>
                <p className="text-gray-600">Scopri la piattaforma passo dopo passo con il nostro tour guidato</p>
              </div>
            </div>
            <Button 
              onClick={() => router.push("/dashboard")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Zap className="mr-2 h-4 w-4" />
              Inizia Tour
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tutorials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="flex items-center gap-2"
            >
              {getCategoryIcon(category)}
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Support Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Additional Support?</h2>
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Support Hours</h3>
          </div>
          <p className="text-blue-800 text-sm">
            Our technical support team is available Monday to Friday, 9:00 AM - 6:00 PM CET. 
            Email responses within 24 hours.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Contact Support</h3>
                  <p className="text-sm text-gray-600 mb-3">Get direct help from our technical team</p>
                  <Button 
                    onClick={() => router.push("/contact")}
                    size="sm"
                    className="w-full"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Us
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Phone Support</h3>
                  <p className="text-sm text-gray-600 mb-3">Speak directly with our team</p>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    +39 02 1234 5678
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <ExternalLink className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Documentation</h3>
                  <p className="text-sm text-gray-600 mb-3">Comprehensive technical docs</p>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Coming Soon
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tutorial Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTutorials.map((tutorial) => (
          <Card key={tutorial.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(tutorial.category)}
                  {tutorial.isPopular && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                </div>
                <Badge className={getDifficultyColor(tutorial.difficulty)}>
                  {tutorial.difficulty}
                </Badge>
              </div>
              <CardTitle className="text-lg">{tutorial.title}</CardTitle>
              <CardDescription>{tutorial.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  {tutorial.duration}
                </div>
                <Badge variant="outline">{tutorial.category}</Badge>
              </div>
              
              {tutorial.steps && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">What you'll learn:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {tutorial.steps.slice(0, 3).map((step, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                        {step}
                      </li>
                    ))}
                    {tutorial.steps.length > 3 && (
                      <li className="text-gray-400">+{tutorial.steps.length - 3} more...</li>
                    )}
                  </ul>
                </div>
              )}
              
              <Button 
                className="w-full"
                onClick={() => setSelectedTutorial(tutorial)}
              >
                <Play className="mr-2 h-4 w-4" />
                Watch Tutorial
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTutorials.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tutorials found</h3>
          <p className="text-gray-600">Try adjusting your search terms or filters</p>
        </div>
      )}

      {/* Tutorial Modal/Viewer */}
      {selectedTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedTutorial.title}</h2>
                  <p className="text-gray-600 mt-1">{selectedTutorial.description}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTutorial(null)}
                >
                  Close
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Video placeholder */}
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-6">
                <div className="text-center text-white">
                  <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Video Player</p>
                  <p className="text-sm opacity-75">Coming soon - {selectedTutorial.duration}</p>
                </div>
              </div>
              
              {/* Tutorial details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">What you'll learn:</h3>
                  <ul className="space-y-2">
                    {selectedTutorial.steps?.map((step, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Tutorial Info:</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Duration: {selectedTutorial.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(selectedTutorial.difficulty)}>
                        {selectedTutorial.difficulty}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(selectedTutorial.category)}
                      <span className="text-sm">{selectedTutorial.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
