'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@startkit/ui'

const testimonials = [
  {
    quote:
      "StartKit saved us months of development time. We launched our MVP in two weeks instead of three months.",
    author: 'Sarah Chen',
    role: 'CTO at Flowbase',
    avatar: '/avatars/sarah.jpg',
    initials: 'SC',
  },
  {
    quote:
      "The multi-tenancy and billing setup alone would have taken us 6 weeks. StartKit had it ready on day one.",
    author: 'Marcus Rodriguez',
    role: 'Founder at ScaleUp',
    avatar: '/avatars/marcus.jpg',
    initials: 'MR',
  },
  {
    quote:
      "We've built three B2B products on StartKit. Each one launched faster than the last. It's our secret weapon.",
    author: 'Emily Tanaka',
    role: 'CEO at BuildCo',
    avatar: '/avatars/emily.jpg',
    initials: 'ET',
  },
]

/**
 * Testimonials section with customer quotes
 */
export function Testimonials() {
  return (
    <section className="py-24 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-4">
            Trusted by Teams
          </p>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-6">
            Loved by developers everywhere
          </h2>
          <p className="text-xl text-muted-foreground">
            Join hundreds of teams shipping faster with StartKit.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.author}
              className="relative rounded-2xl border border-border/50 bg-card p-8 transition-all hover:border-border hover:shadow-lg hover:shadow-black/5"
            >
              {/* Quote mark */}
              <svg
                className="absolute top-6 left-6 h-8 w-8 text-muted-foreground/20"
                fill="currentColor"
                viewBox="0 0 32 32"
              >
                <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
              </svg>

              {/* Quote */}
              <blockquote className="relative z-10 text-lg leading-relaxed mb-8 pt-6">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white font-semibold">
                    {testimonial.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Logos section */}
        <div className="mt-20">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-50">
            {['Vercel', 'Stripe', 'Linear', 'Notion', 'Figma', 'Slack'].map((company) => (
              <div
                key={company}
                className="text-xl font-semibold text-muted-foreground"
              >
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
