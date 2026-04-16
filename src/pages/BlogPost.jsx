import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Fetch all posts and find by slug
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const posts = await base44.entities.BlogPost.list();
        const found = posts.find(p => p.slug === slug && p.published);
        if (found) {
          setPost(found);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);



  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Artikeln hittades inte</h1>
          <Link to="/blogg">
            <Button>Tillbaka till blogg</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background py-12 px-4">
      <article className="max-w-3xl mx-auto space-y-6">
        <Link to="/blogg" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Tillbaka till blogg
        </Link>

        <div className="space-y-3">
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {post.category}
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground leading-tight">{post.title}</h1>
          <p className="text-lg text-muted-foreground">{post.excerpt}</p>
          <p className="text-xs text-muted-foreground">{new Date(post.created_date).toLocaleDateString("sv-SE")}</p>
        </div>

        <div 
          className="prose prose-invert max-w-none bg-card rounded-xl p-8 border border-border"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center space-y-3">
          <h3 className="font-bold text-lg text-foreground">Vill du aldrig missa ett deal?</h3>
          <p className="text-muted-foreground">Bevaka priser gratis på Prisfall — få notis direkt när priset sjunker!</p>
          <Link to="/add">
            <Button className="bg-primary">Börja bevaka nu →</Button>
          </Link>
        </div>
      </article>
    </motion.div>
  );
}