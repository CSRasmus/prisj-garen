import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Share2, Eye } from "lucide-react";
import { motion } from "framer-motion";

function sanitizeHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerHTML;
}

export default function BlogPost() {
  const { slug } = useParams();
  const [relatedProducts, setRelatedProducts] = useState([]);
  const queryClient = useQueryClient();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blogPost", slug],
    queryFn: async () => {
      const posts = await base44.entities.BlogPost.filter({ slug, published: true }, "-created_date", 1);
      if (posts.length === 0) return null;
      const p = posts[0];
      // Increment views
      await base44.asServiceRole.entities.BlogPost.update(p.id, { views: (p.views || 0) + 1 });
      queryClient.invalidateQueries({ queryKey: ["blogPost", slug] });
      return p;
    },
  });

  // Fetch related products
  useEffect(() => {
    if (post?.products_mentioned) {
      const asins = post.products_mentioned.split(",").map(a => a.trim());
      Promise.all(asins.map(asin => base44.entities.Product.filter({ asin }, "-updated_date", 1)))
        .then(results => setRelatedProducts(results.filter(r => r.length > 0).map(r => r[0])))
        .catch(() => {});
    }
  }, [post]);

  const { data: relatedPosts = [] } = useQuery({
    queryKey: ["relatedPosts", post?.category],
    queryFn: async () => {
      if (!post) return [];
      const related = await base44.entities.BlogPost.filter(
        { category: post.category, published: true },
        "-created_date",
        3
      );
      return related.filter(r => r.id !== post.id);
    },
    enabled: !!post,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!post) {
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
        <article className="py-10 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Back button */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Link to="/blogg" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Tillbaka till blogg
              </Link>
            </motion.div>

            {/* Featured image */}
            {post.featured_image_url && (
              <motion.img
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-80 object-cover rounded-xl"
              />
            )}

            {/* Meta */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {post.category}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {post.views || 0} visningar
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(post.created_date).toLocaleDateString("sv-SE")}
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground leading-tight">{post.title}</h1>
              <p className="text-lg text-muted-foreground">{post.excerpt}</p>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="prose prose-invert max-w-none bg-card rounded-xl p-8 border border-border"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
            />

            {/* CTA Banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center space-y-3"
            >
              <h3 className="font-bold text-lg text-foreground">Vill du aldrig missa ett deal?</h3>
              <p className="text-muted-foreground">Bevaka priser gratis på PrisJägaren — få notis direkt när priset sjunker!</p>
              <Link to="/add">
                <Button className="bg-primary">Börja bevaka nu →</Button>
              </Link>
            </motion.div>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                <h3 className="font-bold text-lg text-foreground">Produkter i denna artikel</h3>
                <div className="grid gap-4">
                  {relatedProducts.map(p => (
                    <div key={p.id} className="bg-card border border-border rounded-lg p-4 flex gap-4">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.title} className="w-20 h-20 object-contain rounded" />
                      ) : (
                        <div className="w-20 h-20 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-2xl font-bold text-primary">{p.title.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{p.title}</p>
                          <p className="text-lg font-bold text-primary">{p.current_price} kr</p>
                        </div>
                        <Link to={`/product/${p.id}`}>
                          <Button variant="outline" size="sm">Bevaka priset</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Share */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-2 justify-center"
            >
              <Button
                variant="outline"
                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`)}
              >
                Facebook
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`https://twitter.com/intent/tweet?url=${window.location.href}&text=${post.title}`)}
              >
                X
              </Button>
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
              >
                Kopiera länk
              </Button>
            </motion.div>

            {/* Related Articles */}
            {relatedPosts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-4 pt-8 border-t border-border"
              >
                <h3 className="font-bold text-lg text-foreground">Läs mer inom {post.category}</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {relatedPosts.map(rp => (
                    <Link key={rp.id} to={`/blogg/${rp.slug}`}>
                      <div className="bg-card border border-border rounded-lg p-4 h-full hover:shadow-lg transition-shadow">
                        <p className="font-semibold line-clamp-2 text-foreground mb-2">{rp.title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(rp.created_date).toLocaleDateString("sv-SE")}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </article>
      </div>
  );
}