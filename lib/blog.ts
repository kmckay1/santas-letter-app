import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export interface PostMeta {
  slug: string
  title: string
  description: string
  date: string
  excerpt: string
}

export interface Post extends PostMeta {
  html: string
}

function readPostFile(slug: string): Post | null {
  const fullPath = path.join(BLOG_DIR, `${slug}.md`)
  if (!fs.existsSync(fullPath)) return null
  const raw = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(raw)
  const html = marked.parse(content, { async: false }) as string
  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? '',
    date: data.date ?? '',
    excerpt: data.excerpt ?? data.description ?? '',
    html,
  }
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
}

export function getPost(slug: string): Post | null {
  return readPostFile(slug)
}

export function getAllPosts(): PostMeta[] {
  return getAllPostSlugs()
    .map((slug) => readPostFile(slug))
    .filter((p): p is Post => p !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(({ html, ...meta }) => meta)
}