import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Copy } from "lucide-react";
import { motion } from "framer-motion";

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const readingTime = post ? Math.ceil((post.content?.split(" ").length || 0) / 200) : 0;

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
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <motion.section 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="bg-gradient-to-r from-primary via-primary/90 to-emerald-500 text-white py-16 px-4"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          <Link to="/blogg" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Tillbaka till blogg
          </Link>
          <div>
            <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white mb-3">
              {post.category.toUpperCase()}
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">{post.title}</h1>
          </div>
          <div className="flex items-center gap-4 text-white/80 text-sm flex-wrap">
            <span>{new Date(post.created_date).toLocaleDateString("sv-SE")}</span>
            {readingTime > 0 && <span>Läsningstid: {readingTime} min</span>}
          </div>
        </div>
      </motion.section>

      <motion.article 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="py-12 px-4"
      >
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Summary box */}
          <div className="bg-card border-2 border-primary/20 rounded-xl p-6">
            <p className="text-lg text-foreground font-medium">{post.excerpt}</p>
          </div>

          {/* Main content */}
          <div 
            className="prose prose-lg prose-invert max-w-none space-y-6"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Share buttons */}
          <div className="flex gap-2 justify-center flex-wrap pt-6 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`)}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Facebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyLink}
            >
              <Copy className="w-4 h-4 mr-2" />
              {copied ? "Kopierad!" : "Kopiera länk"}
            </Button>
          </div>

          {/* CTA Banner */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-emerald-500/10 border-2 border-primary/30 rounded-xl p-8 text-center space-y-4">
            <div className="text-4xl">💰</div>
            <h3 className="font-bold text-xl text-foreground">Bevaka dessa priser gratis på Prisfall</h3>
            <p className="text-muted-foreground">Få notis direkt när priset sjunker på produkter du är intresserad av</p>
            <Link to="/add">
              <Button className="bg-primary text-lg h-12">
                Börja bevaka nu →
              </Button>
            </Link>
          </div>
        </div>
      </motion.article>
    </div>
  );
}