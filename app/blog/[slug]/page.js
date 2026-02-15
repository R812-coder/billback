import { getPost, getAllPosts } from '@/lib/blog-posts'
import { notFound } from 'next/navigation'
import BlogPostClient from './BlogPostClient'

// Generate static params for all posts
export async function generateStaticParams() {
  return getAllPosts().map(post => ({ slug: post.slug }))
}

// Dynamic metadata for each post
export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      url: `https://www.bizstackguide.com/blog/${post.slug}`,
    },
  }
}

export default async function BlogPost({ params }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  // Get other posts for "Read next" section
  const allPosts = getAllPosts().filter(p => p.slug !== slug).slice(0, 2)

  return <BlogPostClient post={post} relatedPosts={allPosts} />
}