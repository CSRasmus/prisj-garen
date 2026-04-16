import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";

const CATEGORIES = [
  { value: "all", label: "Alla" },
  { value: "husdjur", label: "Husdjur" },
  { value: "elektronik", label: "Elektronik" },
  { value: "hem", label: "Hem" },
  { value: "deals", label: "Deals" },
];

const CATEGORY_COLORS = {
  husdjur: "bg-orange-100 text-orange-700",
  elektronik: "bg-blue-100 text-blue-700",
  hem: "bg-green-100 text-green-700",
  deals: "bg-red-100 text-red-700",
};

function ArticleCard({ article }) {
  const categoryColor = CATEGORY_COLORS[article.category] || "bg-gray-100 text-gray-700";
  const date = new Date(article.created_date).toLocaleDateString("sv-SE");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
    >
      {article.featured_image_url ? (
        <img src={article.featured_image_url} alt={article.title} className="w-full h-48 object-cover" />
      ) : (
        <div className={`w-full h-48 ${categoryColor}`} />
      )}
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColor}`}>
            {article.category}
          </span>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
        <h3 className="font-bold text-lg line-clamp-2 text-foreground">{article.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
        <Link to={`/blogg/${article.slug}`}>
          <Button variant="outline" size="sm" className="w-full">
            Läs mer →
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

export default function Blog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["blogPosts", search, category],
    queryFn: async () => {
      const filters = { published: true };
      if (category !== "all") filters.category = category;
      let result = await base44.entities.BlogPost.filter(filters, "-created_date", 100);
      if (search) {
        result = result.filter(
          a => a.title.toLowerCase().includes(search.toLowerCase()) ||
               a.excerpt.toLowerCase().includes(search.toLowerCase())
        );
      }
      return result;
    },
  });

  const pageSize = 10;
  const totalPages = Math.ceil(articles.length / pageSize);
  const paginatedArticles = articles.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <Helmet>
        <title>Amazon Deals & Pristips – Blogg | PrisJägaren</title>
        <meta name="description" content="Läs våra senaste artiklar om Amazon deals, pristips och köpguider för Sverige." />
        <meta property="og:title" content="Amazon Deals & Pristips – Blogg | PrisJägaren" />
        <meta property="og:description" content="Läs våra senaste artiklar om Amazon deals, pristips och köpguider för Sverige." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary to-emerald-500 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold">Amazon Deals & Pristips</h1>
            <p className="text-lg text-white/80">Senaste artiklarna om prissänkningar, köpguider och sparande på Amazon.se</p>
          </div>
        </section>

        {/* Search & Filter */}
        <section className="bg-card border-b border-border py-6 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 space-y-4">
            <div className="flex items-center gap-2 bg-input rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Sök artiklar..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="flex-1 bg-transparent border-0 outline-none text-sm"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setPage(1); }}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    category === cat.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : paginatedArticles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Inga artiklar hittades</p>
              </div>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                  {paginatedArticles.map(article => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 flex-wrap">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                          page === p
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}