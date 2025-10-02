import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function Page({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  const params = await searchParams

  // Sanitize error message to prevent XSS attacks
  // Only allow alphanumeric characters, spaces, and basic punctuation
  const sanitizedError = params?.error
    ? params.error.replace(/[^a-zA-Z0-9 .,!?-]/g, '').substring(0, 200)
    : null

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Sorry, something went wrong.</CardTitle>
            </CardHeader>
            <CardContent>
              {sanitizedError ? (
                <p className="text-sm text-muted-foreground">Error: {sanitizedError}</p>
              ) : (
                <p className="text-sm text-muted-foreground">An error occurred during authentication.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
