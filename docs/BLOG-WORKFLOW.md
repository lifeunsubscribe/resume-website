# Adding New Blog Posts: Quick Reference

## The Simple Workflow

```bash
# 1. Create new post folder
cp -r resume-website-files/blog/_template resume-website-files/blog/my-new-post-slug

# 2. Edit the post
# - Update index.html with your content
# - Add images to the images/ folder
# - Update meta tags (title, description, og:image)

# 3. Update blog listing
# - Add new post card to resume-website-files/blog/index.html

# 4. Deploy
git add .
git commit -m "Add blog post: My New Post Title"
git push origin main
# GitHub Actions handles the rest!
```

## Post Folder Structure

```
blog/
├── index.html                    # Blog listing (update this for each new post)
├── _template/                    # Copy this for new posts
│   ├── index.html
│   └── images/
├── 2-buckets-1-website/         # Your first post
│   ├── index.html
│   └── images/
│       ├── diagram-1.png
│       └── meme.jpg
└── my-new-post/                  # Example new post
    ├── index.html
    └── images/
```

## URL Structure

Posts live at: `https://www.cloudwithsarah.com/blog/{slug}/`

**Slug best practices:**
- All lowercase
- Hyphens instead of spaces
- Short but descriptive
- No dates in URL (dates go stale, content doesn't)

Good: `/blog/cloudfront-functions-guide/`
Bad: `/blog/2026-01-27-my-post-about-cloudfront-functions-and-stuff/`

## Checklist for Each New Post

### Before Writing
- [ ] Pick a slug (folder name)
- [ ] Create folder from template

### In the Post (index.html)
- [ ] Update `<title>` tag
- [ ] Update `<meta name="description">`
- [ ] Update Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`)
- [ ] Add your content
- [ ] Add images (optimize them first!)
- [ ] Check all internal links work
- [ ] Add code syntax highlighting classes

### In Blog Listing (blog/index.html)
- [ ] Add new post card at the TOP (newest first)
- [ ] Include: title, date, description, link
- [ ] Add thumbnail if you have one

### Before Deploying
- [ ] Preview locally (open index.html in browser)
- [ ] Check mobile responsiveness
- [ ] Spell check
- [ ] Validate HTML
- [ ] Optimize images (WebP preferred, fallback PNG/JPG)

### After Deploying
- [ ] Verify post loads at correct URL
- [ ] Check images load
- [ ] Test on mobile
- [ ] Share on LinkedIn! 🎉

## Image Guidelines

**Location:** `blog/{post-slug}/images/`

**Naming:** Descriptive, lowercase, hyphens
- Good: `cloudfront-architecture-diagram.png`
- Bad: `Screenshot 2026-01-27 at 3.45.12 PM.png`

**Optimization:**
- Use WebP format when possible
- Max width: 1200px (blog content area is ~800px)
- Compress with tools like Squoosh or ImageOptim
- Add `loading="lazy"` for images below the fold

**In HTML:**
```html
<figure>
  <img 
    src="images/my-diagram.png" 
    alt="Descriptive alt text for accessibility"
    loading="lazy"
  >
  <figcaption>Caption explaining the image</figcaption>
</figure>
```

## Code Blocks

Use Prism.js classes for syntax highlighting:

```html
<pre><code class="language-typescript">
const example = "your code here";
</code></pre>
```

Supported languages: `typescript`, `javascript`, `python`, `bash`, `json`, `yaml`, `html`, `css`

## Generating Diagrams

If you need AWS architecture diagrams:

```bash
cd scripts
python generate_blog_diagrams.py --post my-new-post
```

Or manually create with:
- Python `diagrams` library (for AWS architecture)
- Excalidraw (for hand-drawn style)
- Mermaid (for flowcharts, embeddable)

## SEO Basics

Each post should have:

```html
<head>
  <title>Post Title | Cloud With Sarah</title>
  <meta name="description" content="2-3 sentence summary of the post">
  
  <!-- Open Graph for social sharing -->
  <meta property="og:title" content="Post Title">
  <meta property="og:description" content="Same as meta description">
  <meta property="og:image" content="https://www.cloudwithsarah.com/blog/slug/images/og-image.png">
  <meta property="og:url" content="https://www.cloudwithsarah.com/blog/slug/">
  <meta property="og:type" content="article">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
</head>
```

**OG Image specs:** 1200x630px, PNG or JPG

## Cross-Linking

Link between your blog and portfolio naturally:

**From portfolio to blog:**
> "I wrote about [how I built this site's redirect logic](/blog/2-buckets-1-website/)."

**From blog to portfolio:**
> "Check out my [portfolio](/index.html) to see this architecture in action."

**Between blog posts:**
> "In my [previous post about CloudFront](/blog/cloudfront-basics/), I covered..."

## Future Improvements (Optional)

Things you might add later:
- RSS feed (`/blog/feed.xml`)
- Tags/categories
- Search functionality
- Comments (Disqus, Utterances, or custom)
- Reading time estimate
- Table of contents for long posts
- "Related posts" section
- Newsletter signup

But start simple! You can always add these later.
