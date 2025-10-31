
import React, { useState, useCallback, useEffect } from 'react';
import { shortenUrl, resolveShortCode } from './services/shortenerService';
import { UrlResult } from './components/UrlResult';
import { Loader } from './components/Loader';
import { LinkIcon } from './components/icons/LinkIcon';

const App: React.FC = () => {
  const [longUrl, setLongUrl] = useState('');
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On first load, if the path contains a short code (e.g. /abc123), resolve it and redirect.
  useEffect(() => {
    const path = window.location.pathname.replace(/^\//, '');
    if (!path) return; // root path, nothing to do

    // Only treat reasonable short-code-like paths (alphanumeric, 4-12 chars) to avoid
    // interfering with other routes
    const isShortCode = /^[A-Za-z0-9_-]{4,12}$/.test(path);
    if (!isShortCode) return;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const long = await resolveShortCode(path);
        if (long) {
          // Use replace so navigation history doesn't create an extra step
          window.location.replace(long);
        } else {
          setError('Short link not found.');
        }
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('An unknown error occurred while resolving the short link.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!longUrl) {
      setError('Please enter a URL to shorten.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setShortUrl(null);

    try {
      const result = await shortenUrl(longUrl);
      setShortUrl(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [longUrl]);
  
  return (
    <div className="min-h-screen bg-brand-gray-dark text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-2">
            <LinkIcon className="h-8 w-8 text-brand-purple-light" />
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 text-transparent bg-clip-text">
              QuickLink
            </h1>
          </div>
          <p className="text-gray-400 text-lg">The simplest way to shorten your long URLs.</p>
        </header>

        <main className="bg-brand-gray-medium rounded-xl shadow-2xl p-6 sm:p-8">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="url"
                value={longUrl}
                onChange={(e) => setLongUrl(e.target.value)}
                placeholder="https://paste-your-long-url-here.com/..."
                className="flex-grow bg-brand-gray-dark border-2 border-brand-gray-light focus:border-brand-purple focus:ring-brand-purple text-white rounded-lg px-4 py-3 transition-colors duration-200 outline-none w-full"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto bg-brand-purple hover:bg-brand-purple-light disabled:bg-brand-gray-light disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 flex items-center justify-center"
              >
                {isLoading ? (
                   <>
                    <Loader />
                    <span className="ml-2">Shortening...</span>
                  </>
                ) : (
                  'Shorten URL'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 min-h-[60px]">
             {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                <p>{error}</p>
              </div>
            )}
            {shortUrl && <UrlResult shortUrl={shortUrl} />}
          </div>
        </main>
        
        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by React & Tailwind CSS. A frontend simulation.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
