/**
 * Healthcare testimonials data for the login page
 * Professional testimonials from healthcare providers and patients
 */

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  title: string;
  rating: number;
  image?: string;
  location?: string;
}

/**
 * Professional healthcare testimonials showcasing Zenthea EHR benefits
 * Each testimonial includes rating, author details, and compelling quotes
 */
export const testimonials: Testimonial[] = [
  {
    id: 'testimonial-1',
    quote: "We've been using Zenthea to kick start every new project and can't imagine working without it.",
    author: "Dr. Sarah Chen",
    title: "Chief Medical Officer, MedTech Solutions",
    rating: 5,
    location: "San Francisco, CA"
  },
  {
    id: 'testimonial-2',
    quote: "Zenthea has revolutionized our patient care workflow. The AI-powered features save us hours every day.",
    author: "Dr. Michael Rodriguez",
    title: "Family Medicine Physician",
    rating: 5,
    location: "Austin, TX"
  },
  {
    id: 'testimonial-3',
    quote: "The intuitive design and comprehensive features make Zenthea the best EHR system we've ever used.",
    author: "Jennifer Walsh, RN",
    title: "Nurse Manager, City General Hospital",
    rating: 5,
    location: "Chicago, IL"
  },
  {
    id: 'testimonial-4',
    quote: "Zenthea's patient portal has improved our patient engagement by 300%. The interface is so user-friendly.",
    author: "Dr. Emily Johnson",
    title: "Pediatrician, Children's Health Center",
    rating: 5,
    location: "Seattle, WA"
  },
  {
    id: 'testimonial-5',
    quote: "The real-time collaboration features have transformed how our team works together. It's game-changing.",
    author: "Dr. Robert Kim",
    title: "Emergency Medicine Physician",
    rating: 5,
    location: "Los Angeles, CA"
  }
];

/**
 * Get a random testimonial from the collection
 * Useful for rotating testimonials or A/B testing
 */
export function getRandomTestimonial(): Testimonial {
  const randomIndex = Math.floor(Math.random() * testimonials.length);
  return testimonials[randomIndex]!;
}

/**
 * Get testimonials by rating
 * Filter testimonials by minimum rating
 */
export function getTestimonialsByRating(minRating: number): Testimonial[] {
  return testimonials.filter(testimonial => testimonial.rating >= minRating);
}

/**
 * Get testimonials by location
 * Filter testimonials by specific location
 */
export function getTestimonialsByLocation(location: string): Testimonial[] {
  return testimonials.filter(testimonial => 
    testimonial.location?.toLowerCase().includes(location.toLowerCase())
  );
}
