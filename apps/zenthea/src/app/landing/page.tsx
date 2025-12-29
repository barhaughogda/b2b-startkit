"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowUpRight,
  MessageSquare,
  Mic,
  Clock,
  FileText,
  DollarSign,
  Brain,
  Heart,
  Headphones,
  Star,
  Mail,
  Phone,
  MapPin,
  Menu,
  X,
  CheckCircle,
  Bot,
  Stethoscope,
  ClipboardList,
  CheckSquare,
  Clipboard,
  FlaskConical,
  Receipt,
  Activity,
  CalendarDays,
  User,
  Code2,
  Linkedin,
  Facebook,
  Users,
  TrendingUp,
  Award
} from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import Script from "next/script";

// Zenthea Logo Component
const ZENTHEA_LOGO_URL = "https://res.cloudinary.com/dnfaqg0wg/image/upload/v1764137239/logo_atay0w.svg";

// Cloudinary Images
const IMAGES = {
  heroDoctor: "https://res.cloudinary.com/dnfaqg0wg/image/upload/v1764758019/3._Meet_Thea_Section_beqnti.jpg",
  doctor1: "https://res.cloudinary.com/dnfaqg0wg/image/upload/v1764758019/8._Key_Benefits_Section_ufwwla.jpg",
  doctor2: "https://res.cloudinary.com/dnfaqg0wg/image/upload/v1764140741/Doctor2_ctkbhh.png",
  doctor3: "https://res.cloudinary.com/dnfaqg0wg/image/upload/v1764140741/Doctor3_fav29m.png",
  // Phone mockup using a gradient illustration placeholder
  phoneMockup: "https://res.cloudinary.com/dnfaqg0wg/image/upload/c_fill,w_288,h_550,q_auto,f_auto/v1764137297/website3_qszfpw.png",
  billingDoctor: "https://res.cloudinary.com/dnfaqg0wg/image/upload/v1764758019/6._Why_Clinics_Choose_Zenthea_Section_jhqz5l.jpg",
};

function ZentheaLogo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <img 
      src={ZENTHEA_LOGO_URL}
      alt="Zenthea Logo"
      className={className}
    />
  );
}

// Smooth scroll handler
function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
  e.preventDefault();
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoContainerRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  
  // Debug flag for development logging
  const DEBUG = process.env.NODE_ENV === 'development';
  
  // Cloudinary configuration from environment
  const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnfaqg0wg';

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#testimonials", label: "Testimonials" },
    { href: "#faq", label: "FAQ" },
    { href: "#waitlist", label: "Contact" },
  ];

  // Initialize Cloudinary Player after component mounts and script loads
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds max wait time
    
    const initPlayer = () => {
      if (!videoContainerRef.current || typeof window === 'undefined') {
        if (DEBUG) console.log('Video container or window not available');
        return;
      }

      // Check multiple possible locations for Cloudinary Player
      const cloudinary = (window as any).cloudinary || 
                        (window as any).cld || 
                        (globalThis as any).cloudinary ||
                        (globalThis as any).cld;
      
      if (DEBUG && retryCount % 10 === 0) { // Log every 10th retry to reduce spam
        if (DEBUG) console.log('Checking for Cloudinary Player:', {
          hasWindow: typeof window !== 'undefined',
          hasCloudinary: !!cloudinary,
          hasVideoPlayer: cloudinary?.videoPlayer ? true : false,
          hasVideoPlayerWithProfile: cloudinary?.videoPlayerWithProfile ? true : false,
          cloudinaryKeys: cloudinary ? Object.keys(cloudinary) : [],
          retryCount
        });
      }
      
      // Use videoPlayerWithProfile if available (for profile support), otherwise videoPlayer
      const playerMethod = cloudinary?.videoPlayerWithProfile || cloudinary?.videoPlayer;
      
      if (!cloudinary || !playerMethod) {
        retryCount++;
        if (retryCount < maxRetries) {
          // Retry after a short delay if Cloudinary isn't ready yet
          setTimeout(initPlayer, 100);
        } else {
          if (DEBUG) console.error('Cloudinary Player failed to load after', maxRetries, 'retries');
        }
        return;
      }

      // Get the video element ID (should already be set in JSX)
      const playerId = videoContainerRef.current.id || 'landing-video-player';
      if (!videoContainerRef.current.id) {
        videoContainerRef.current.id = playerId;
      }
      
      // Ensure it's a video element
      if (videoContainerRef.current.tagName !== 'VIDEO') {
        if (DEBUG) console.error('Video container must be a <video> element, got:', videoContainerRef.current.tagName);
        return;
      }
      
      // Initialize Cloudinary Player if not already initialized
      if (!playerRef.current) {
        try {
          if (DEBUG) {
            console.log('Initializing Cloudinary Player with config:', {
              playerId,
              cloudName: cloudinaryCloudName,
              publicId: 'Talking_etwhfz',
              usingMethod: cloudinary.videoPlayerWithProfile ? 'videoPlayerWithProfile' : 'videoPlayer'
            });
          }
          
          // Use videoPlayer directly (profile 'looping2' may not exist in Cloudinary account)
          // Configure for looping autoplay manually
          playerRef.current = cloudinary.videoPlayer(playerId, {
            cloudName: cloudinaryCloudName,
            publicId: 'Talking_etwhfz',
            autoplay: true,
            loop: true,
            muted: true,
            playsinline: true,
            controls: false,
            fluid: true,
            transformation: {
              quality: 'auto',
              fetchFormat: 'auto'
            }
          });
          
          // Handle player ready event
          if (playerRef.current && typeof playerRef.current.ready === 'function') {
            playerRef.current.ready(() => {
              setIsVideoReady(true);
              if (DEBUG) console.log('✅ Video player is ready and should be playing');
            });
          } else {
            // If ready method doesn't exist, assume ready after initialization
            setIsVideoReady(true);
          }
          
          if (DEBUG) console.log('✅ Cloudinary Player initialized successfully');
        } catch (error) {
          // Always log errors, even in production
          console.error('❌ Failed to initialize Cloudinary Player:', error);
        }
      }
    };

    // Wait a bit for the script to load, then try to initialize
    const timeoutId = setTimeout(() => {
      initPlayer();
    }, 500);

    // Also try immediately in case script is already loaded
    initPlayer();

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.destroy === 'function') {
            playerRef.current.destroy();
          } else if (typeof playerRef.current.dispose === 'function') {
            playerRef.current.dispose();
          }
        } catch (error) {
          if (DEBUG) console.warn('Error destroying Cloudinary Player:', error);
        }
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* Cloudinary Player Scripts */}
      <Script
        src="https://unpkg.com/cloudinary-video-player@1/dist/cld-video-player.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (DEBUG) console.log('✅ Cloudinary Player script loaded');
          // Check what's available
          if (DEBUG && typeof window !== 'undefined') {
            const cld = (window as any).cloudinary;
            if (DEBUG) console.log('Window.cloudinary exists:', !!cld);
            if (DEBUG) console.log('Window.cloudinary keys:', cld ? Object.keys(cld) : []);
            if (DEBUG) console.log('Window.cloudinary.player:', cld?.player);
            if (DEBUG) console.log('Window.cloudinary.videoPlayer:', cld?.videoPlayer);
            if (DEBUG) console.log('Window.cloudinary.VideoPlayer:', cld?.VideoPlayer);
          }
          // Trigger initialization after script loads
          setTimeout(() => {
            if (videoContainerRef.current) {
              const event = new Event('cloudinary-ready');
              window.dispatchEvent(event);
            }
          }, 100);
        }}
        onError={(e) => {
          // Always log errors, even in production
          console.error('❌ Failed to load Cloudinary Player script:', e);
        }}
      />
      <link
        href="https://unpkg.com/cloudinary-video-player@1/dist/cld-video-player.min.css"
        rel="stylesheet"
      />
      
      <div className="min-h-screen bg-[#FDF8F3]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/50 bg-[#FDF8F3]/95 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center">
            <ZentheaLogo className="h-10 w-auto" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href.slice(1))}
                className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/auth/signin" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">
              Login
            </Link>
            <a href="#waitlist" onClick={(e) => scrollToSection(e, 'waitlist')}>
              <Button className="bg-[#619fa3] hover:bg-[#528a8e] text-white rounded-full px-6">
                Join Waitlist
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-[#FDF8F3]">
            <div className="container mx-auto px-6 py-4 space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    scrollToSection(e, link.href.slice(1));
                    setIsMenuOpen(false);
                  }}
                  className="block py-2 text-gray-700 hover:text-gray-900"
                >
                  {link.label}
                </a>
              ))}
              <hr className="my-2" />
              <Link href="/auth/signin">
                <Button variant="ghost" className="w-full justify-start text-gray-700">
                  Login
                </Button>
              </Link>
              <a href="#waitlist" onClick={(e) => { scrollToSection(e, 'waitlist'); setIsMenuOpen(false); }}>
                <Button className="w-full bg-[#619fa3] hover:bg-[#528a8e] text-white rounded-full">
                  Join Waitlist
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-7xl text-center">
          <div className="flex items-center justify-center mb-6">
            <span className="w-2 h-2 rounded-full bg-[#619fa3] mr-3"></span>
            <p className="text-gray-600 text-sm md:text-base">
              Your AI driven EHR system
            </p>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif text-gray-900 mb-6 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            Restoring humanity to<br className="hidden sm:block" /> healthcare
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
            Making your administrative technology invisible so you can focus on what matters most — your patients.
          </p>
          <a href="#waitlist" onClick={(e) => scrollToSection(e, 'waitlist')}>
            <Button size="lg" className="bg-[#619fa3] hover:bg-[#528a8e] text-white rounded-full px-8 py-6 text-lg">
              Join Waitlist
              <ArrowUpRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </div>
      </section>

      {/* Hero Video */}
      <section className="px-6 pb-16 md:pb-24">
        <div className="container mx-auto max-w-5xl">
          <div className="relative rounded-3xl overflow-hidden bg-gray-200 aspect-[16/9]">
            {!isVideoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                <p className="text-gray-500">Loading video...</p>
              </div>
            )}
            <video
              ref={videoContainerRef}
              id="landing-video-player"
              className="absolute inset-0 w-full h-full"
              aria-label="Healthcare professionals in conversation"
            />
          </div>
        </div>
      </section>

      {/* Social Proof Banner */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-[#619fa3]/10 rounded-full flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-[#619fa3]" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">50+</p>
              <p className="text-sm text-gray-500">Beta Testers</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-[#619fa3]/10 rounded-full flex items-center justify-center mb-3">
                <TrendingUp className="h-6 w-6 text-[#619fa3]" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">70%</p>
              <p className="text-sm text-gray-500">Time Saved</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-[#619fa3]/10 rounded-full flex items-center justify-center mb-3">
                <Award className="h-6 w-6 text-[#619fa3]" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">100%</p>
              <p className="text-sm text-gray-500">HIPAA Compliant</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-[#619fa3]/10 rounded-full flex items-center justify-center mb-3">
                <Star className="h-6 w-6 text-[#619fa3]" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">4.9</p>
              <p className="text-sm text-gray-500">User Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Meet Thea Section */}
      <section className="py-16 md:py-24 bg-[#FDF8F3]">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-5xl font-serif text-gray-900 mb-6 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                Meet Thea, your<br />intelligent clinical partner
              </h2>
              
              <div className="flex items-start gap-4 mb-8">
                <p className="text-gray-600 text-lg leading-relaxed">
                  Thea is the built-in AI assistant inside Zenthea. Similar to a clinical version of Siri, Thea listens, understands, and takes action. Clinicians can speak naturally, type, or tap. Thea converts language into structured actions inside your EHR.
                </p>
                {/* Thea Icon */}
                <div className="flex-shrink-0 w-16 h-16 bg-[#619fa3] rounded-full flex items-center justify-center shadow-lg shadow-[#619fa3]/30">
                  <Bot className="h-8 w-8 text-white" />
                </div>
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-4">
                {[
                  "Ambient listening to capture the entire clinical encounter",
                  "Generate structured notes instantly",
                  "Place orders and schedule follow-ups",
                  "Summarize complex patient histories",
                  "Answer workflow and medical questions",
                  "Guide new staff during onboarding"
                ].map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-[#619fa3] flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column - Image */}
            <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
              <div className="relative">
                <img
                  src={IMAGES.heroDoctor}
                  alt="Healthcare professional with Thea AI assistant"
                  className="w-full max-w-md rounded-2xl shadow-lg object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section id="features" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto max-w-7xl px-6">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-2 h-2 bg-[#619fa3] rounded-full"></span>
              <p className="text-gray-700 font-medium">Core features</p>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
              Core features of the<br />Zenthea EHR
            </h2>
            </div>

            {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  icon: <Clipboard className="h-6 w-6" />,
                  title: "AI-assisted clinical documentation",
                description: "Ambient capture, voice commands, and adaptive templates that learn your style."
                },
                {
                  icon: <FlaskConical className="h-6 w-6" />,
                  title: "Orders, results, and prescribing",
                description: "Fast ordering, structured results, interaction checks, and intelligent summarization."
                },
                {
                  icon: <Receipt className="h-6 w-6" />,
                  title: "AI-powered billing and claims",
                description: "Automatic charge capture, coding guidance, error prevention, real-time claim tracking."
                },
                {
                  icon: <Activity className="h-6 w-6" />,
                  title: "Body Map Timeline",
                description: "A visual and interactive timeline of the human body explaining diagnoses and symptoms."
                },
                {
                  icon: <CalendarDays className="h-6 w-6" />,
                title: "Scheduling and front desk",
                description: "Online booking, automated reminders, waitlist management, and check-in flows."
                },
                {
                  icon: <User className="h-6 w-6" />,
                  title: "Patient Portal",
                description: "Access records, secure messaging, and appointment management from anywhere."
                }
              ].map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-2xl bg-[#FDF8F3] hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 border-2 border-[#619fa3] rounded-xl flex items-center justify-center mb-5 mx-auto text-[#619fa3]">
                    {feature.icon}
                  </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
          </div>

          {/* CTA Button */}
          <div className="text-center mt-12">
            <a href="#waitlist" onClick={(e) => scrollToSection(e, 'waitlist')}>
              <Button className="bg-[#619fa3] hover:bg-[#528a8e] text-white rounded-full px-8 py-6 text-lg">
                Apply for the Free Beta Pilot
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 md:py-24 bg-[#FDF8F3]">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-[#619fa3] font-medium mb-2">Testimonials</p>
            <h2 className="text-3xl md:text-5xl font-serif text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
              What our beta testers say<br />about Zenthea
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Dr. Ingrid Solberg",
                role: "Family Medicine",
                image: IMAGES.doctor2,
                rating: 4.8,
                quote: "This service has truly transformed my daily routine. The attention to detail and personalized approach made all the difference."
              },
              {
                name: "Dr. Kwame Mensah",
                role: "Internal Medicine",
                image: IMAGES.doctor1,
                rating: 4.9,
                quote: "A seamless experience from start to finish. I felt supported every step of the way, and the results speak for themselves."
              },
              {
                name: "Dr. James Carter",
                role: "Pediatrics",
                image: IMAGES.doctor3,
                rating: 5.0,
                quote: "I was hesitant at first, but this turned out to be exactly what I needed. Highly recommended for anyone looking for real change."
              }
            ].map((testimonial, index) => (
              <Card key={index} className="bg-white border-0 shadow-sm rounded-2xl hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <img 
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-14 h-14 rounded-full object-cover mr-4"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
              </div>
            </div>
                  <p className="text-gray-600 italic mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-5 w-5 ${i < Math.floor(testimonial.rating) ? 'fill-[#619fa3] text-[#619fa3]' : 'text-gray-200'}`} 
                      />
                    ))}
                    <span className="ml-2 text-gray-600 font-medium">{testimonial.rating}</span>
                </div>
                </CardContent>
              </Card>
            ))}
              </div>
                </div>
      </section>

      {/* Why Clinics Choose Zenthea Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left Column - Content */}
            <div>
              {/* Section Header */}
              <p className="text-sm font-medium tracking-widest text-gray-500 uppercase mb-4">
                Why Clinics Choose Zenthea
              </p>
              <h2 className="text-3xl md:text-5xl font-serif text-gray-900 mb-12 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                A smarter, faster, more human way to practice medicine
              </h2>

              {/* Feature Blocks */}
              <div className="space-y-10">
                {/* For Clinicians */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#619fa3]/10 rounded-lg flex items-center justify-center">
                      <Stethoscope className="h-5 w-5 text-[#619fa3]" />
                </div>
                    <h3 className="text-xl font-semibold text-gray-900">For clinicians</h3>
              </div>
                  <ul className="space-y-2 text-gray-600 ml-13">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-[#619fa3] mt-1 flex-shrink-0" />
                      <span>Notes created automatically from the clinical conversation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-[#619fa3] mt-1 flex-shrink-0" />
                      <span>Voice-driven workflows with fewer clicks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-[#619fa3] mt-1 flex-shrink-0" />
                      <span>Clear summaries of what matters most</span>
                    </li>
                  </ul>
          </div>

                {/* For Clinic Managers */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#619fa3]/10 rounded-lg flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-[#619fa3]" />
                </div>
                    <h3 className="text-xl font-semibold text-gray-900">For clinic managers</h3>
                  </div>
                  <ul className="space-y-2 text-gray-600 ml-13">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-[#619fa3] mt-1 flex-shrink-0" />
                      <span>Integrated scheduling, coordination, and billing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-[#619fa3] mt-1 flex-shrink-0" />
                      <span>Automated reminders and follow-up flows</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-[#619fa3] mt-1 flex-shrink-0" />
                      <span>Real-time visibility into clinic operations</span>
                    </li>
                  </ul>
              </div>

                {/* For Patients */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#619fa3]/10 rounded-lg flex items-center justify-center">
                      <CheckSquare className="h-5 w-5 text-[#619fa3]" />
                </div>
                    <h3 className="text-xl font-semibold text-gray-900">For patients</h3>
              </div>
                  <ul className="space-y-2 text-gray-600 ml-13">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-[#619fa3] mt-1 flex-shrink-0" />
                      <span>Book appointments through the mobile app</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-[#619fa3] mt-1 flex-shrink-0" />
                      <span>Select visit urgency based on symptoms</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-[#619fa3] mt-1 flex-shrink-0" />
                      <span>Access records and communicate securely</span>
                    </li>
                  </ul>
            </div>
            </div>

              {/* CTA Button */}
              <div className="mt-10">
                <a href="#waitlist" onClick={(e) => scrollToSection(e, 'waitlist')}>
                  <Button className="bg-[#619fa3] hover:bg-[#528a8e] text-white rounded-full px-8 py-6 text-lg">
                    Apply for the Free Beta Pilot
                  </Button>
                </a>
                </div>
              </div>

            {/* Right Column - Image */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md">
                <img
                  src={IMAGES.doctor1}
                  alt="Healthcare professional using Zenthea"
                  className="w-full h-auto rounded-2xl shadow-lg object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Billing Section */}
      <section className="py-16 md:py-24 bg-[#FDF8F3]">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div>
              <h2 className="text-3xl md:text-5xl font-serif text-gray-900 mb-6 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                Billing that works for you
              </h2>
              
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Zenthea includes a complete revenue cycle engine powered by AI. 
                Charges are created as you document. Coding suggestions appear in real time. 
                Claims are validated before submission and tracked from start to finish.
              </p>

              {/* Benefits List */}
              <div className="mb-8">
                <p className="text-gray-900 font-semibold mb-4">Benefits:</p>
                <ul className="space-y-3">
                  {[
                    "Fewer denials",
                    "Faster reimbursement",
                    "Clear financial visibility",
                    "Lower administrative burden"
                  ].map((benefit, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-[#619fa3] flex-shrink-0" />
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <a href="#waitlist" onClick={(e) => scrollToSection(e, 'waitlist')}>
                <Button className="bg-[#619fa3] hover:bg-[#528a8e] text-white rounded-full px-8 py-6 text-lg">
                  Apply for the Free Beta Pilot
                </Button>
              </a>
            </div>

            {/* Right Column - Visual */}
            <div className="flex flex-col items-center lg:items-end">
              {/* Feature Icons Row */}
              <div className="flex gap-6 mb-8">
                {/* Easy code feed */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-[#619fa3]/10 rounded-xl flex items-center justify-center mb-2">
                    <Code2 className="h-7 w-7 text-[#619fa3]" />
                  </div>
                  <span className="text-xs text-gray-600 text-center">Easy<br />code feed</span>
                </div>
                
                {/* Insurance requirements */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-[#619fa3]/10 rounded-xl flex items-center justify-center mb-2">
                    <FileText className="h-7 w-7 text-[#619fa3]" />
                  </div>
                  <span className="text-xs text-gray-600 text-center">Insurance<br />requirements</span>
                </div>
                
                {/* Claim feedback */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-[#619fa3]/10 rounded-xl flex items-center justify-center mb-2">
                    <MessageSquare className="h-7 w-7 text-[#619fa3]" />
                  </div>
                  <span className="text-xs text-gray-600 text-center">Claim<br />feedback</span>
                </div>
              </div>

              {/* Image with Microphone Icon */}
              <div className="relative">
                <img
                  src={IMAGES.billingDoctor}
                  alt="Healthcare professional with billing features"
                  className="w-80 h-96 rounded-2xl object-cover shadow-lg"
                />
                
                {/* Microphone Icon Overlay */}
                <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2">
                  <div className="w-16 h-16 bg-[#619fa3] rounded-full flex items-center justify-center shadow-lg shadow-[#619fa3]/30">
                    <Mic className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits Section (Simplified) */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-[#619fa3] font-medium mb-2">Benefits</p>
            <h2 className="text-3xl md:text-5xl font-serif text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
              Discover the key benefits<br />for your practice
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: <Clock className="h-8 w-8" />,
                title: "Time with Patients",
                description: "Enhance quality time with your patients by reducing administrative burden."
              },
              {
                icon: <FileText className="h-8 w-8" />,
                title: "Less Administration",
                description: "Reduce time spent on manual updating of medical records by up to 70%."
              },
              {
                icon: <DollarSign className="h-8 w-8" />,
                title: "Reduced Cost",
                description: "Lower operational costs through intelligent automation and efficiency."
              },
              {
                icon: <Brain className="h-8 w-8" />,
                title: "Intelligent Communication",
                description: "Let AI take care of the time-consuming repetitive work."
              },
              {
                icon: <Heart className="h-8 w-8" />,
                title: "Personalized Care",
                description: "Let your patients feel taken care of when they need it most."
              },
              {
                icon: <Headphones className="h-8 w-8" />,
                title: "Live Support",
                description: "Connect with a supportive team dedicated to your success."
              }
            ].map((feature, index) => (
              <Card key={index} className="border-0 shadow-sm rounded-2xl bg-[#FDF8F3] hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-[#619fa3]/10 rounded-xl flex items-center justify-center mb-6 text-[#619fa3]">
                    {feature.icon}
                      </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24 bg-[#FDF8F3]">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-[#619fa3] font-medium mb-2">FAQ</p>
            <h2 className="text-3xl md:text-5xl font-serif text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
              Frequently asked questions
            </h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {[
                {
                  question: "What is Zenthea?",
                  answer: "Zenthea is an AI-driven Electronic Health Record (EHR) system designed to restore humanity to healthcare by automating administrative tasks and freeing up your time to focus on patient care."
                },
                {
                  question: "How does the AI documentation work?",
                  answer: "Thea, our AI assistant, uses ambient listening to capture clinical conversations. It then automatically generates structured clinical notes, saving you hours of documentation time while maintaining accuracy and compliance."
                },
                {
                  question: "Is Zenthea HIPAA compliant?",
                  answer: "Yes, Zenthea is 100% HIPAA compliant. We use enterprise-grade encryption, secure cloud infrastructure, and follow all regulatory requirements to protect patient data."
                },
                {
                  question: "Can I integrate with my existing systems?",
                  answer: "Absolutely. Zenthea integrates with major healthcare platforms, lab systems, billing software, and other third-party tools to create a seamless workflow."
                },
                {
                  question: "Is Zenthea mobile-friendly?",
                  answer: "Yes, Zenthea is built mobile-first. You can access all features from your smartphone or tablet, allowing you to provide care from anywhere."
                },
                {
                  question: "What support is available?",
                  answer: "We provide comprehensive support including 24/7 technical assistance, dedicated customer success managers, training programs, and ongoing system optimization."
                }
              ].map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border border-gray-200 rounded-2xl px-6 bg-white">
                  <AccordionTrigger className="text-left font-semibold text-gray-900 hover:text-[#619fa3] py-6">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pb-6 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Waitlist Form Section */}
      <section id="waitlist" className="py-16 md:py-24 bg-[#619fa3]">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-serif text-white mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              Join the Waitlist
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              The future of healthcare is right around the corner. Be among the first to experience Zenthea.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Contact Info */}
              <div className="text-white space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Phone className="h-5 w-5" />
                  </div>
                  <span>+1 (901) 555-0123</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <span>hello@zenthea.ai</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span>Memphis, Tennessee</span>
                </div>
              </div>

              {/* Form */}
              <Card className="md:col-span-2 border-0 shadow-lg rounded-2xl">
                <CardContent className="p-8">
                  <form className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName" className="text-gray-700 font-medium">Full Name</Label>
                      <Input 
                        id="fullName" 
                        placeholder="Your full name" 
                        className="mt-2 rounded-xl border-gray-200 focus:border-[#619fa3] focus:ring-[#619fa3]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="your@email.com" 
                        className="mt-2 rounded-xl border-gray-200 focus:border-[#619fa3] focus:ring-[#619fa3]"
                      />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone" className="text-gray-700 font-medium">Phone Number</Label>
                      <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="+1 (555) 123-4567" 
                        className="mt-2 rounded-xl border-gray-200 focus:border-[#619fa3] focus:ring-[#619fa3]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="profession" className="text-gray-700 font-medium">Your profession</Label>
                      <Select>
                        <SelectTrigger className="mt-2 rounded-xl border-gray-200 focus:border-[#619fa3] focus:ring-[#619fa3]">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="physician">Physician</SelectItem>
                          <SelectItem value="nurse">Nurse</SelectItem>
                            <SelectItem value="clinic-owner">Clinic Owner</SelectItem>
                            <SelectItem value="administrator">Administrator</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes" className="text-gray-700 font-medium">Additional Notes</Label>
                      <Textarea 
                        id="notes" 
                        placeholder="Tell us about your practice..." 
                        rows={3} 
                        className="mt-2 rounded-xl border-gray-200 focus:border-[#619fa3] focus:ring-[#619fa3]"
                      />
                    </div>

                    <Button className="w-full bg-[#619fa3] hover:bg-[#528a8e] text-white rounded-full py-6 text-lg">
                      Reserve my spot
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Brand Column */}
            <div className="md:col-span-2">
              <div className="mb-6">
                <ZentheaLogo className="h-10 w-auto brightness-0 invert" />
              </div>
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                Zenthea is revolutionizing healthcare with AI-powered EHR solutions that restore humanity to medicine. 
                Our mission is to free clinicians from administrative burden so they can focus on what matters most — their patients.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors" aria-label="Facebook">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors" aria-label="LinkedIn">
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="text-gray-400 hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#testimonials" onClick={(e) => scrollToSection(e, 'testimonials')} className="text-gray-400 hover:text-white transition-colors">
                    Testimonials
                  </a>
                </li>
                <li>
                  <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="text-gray-400 hover:text-white transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#waitlist" onClick={(e) => scrollToSection(e, 'waitlist')} className="text-gray-400 hover:text-white transition-colors">
                    Join Waitlist
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>hello@zenthea.ai</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>+1 (901) 555-0123</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>Memphis, Tennessee</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Zenthea. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">HIPAA Compliance</a>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}
