# Album Tessellator - Design

The basic idea is that a user visiting the page will receive a randomized sample of audio
from each track in the album being previewed - one very short snippet per track (e.g. 1 second).
Along with this, the background of the page will be divided vertically into strips representing
tracks, and each of those strips will be divided into blocks representing snippets of each track's
audio that the user has heard. As time passes, the user will receive more and more random samplings
with no repeats, until they have heard all the audio (albeit never contiguously)
and the entire image is visible.

As chunks of songs appear, they should become clickable. As contiguous chunks appear, they should
be joined together and play continuously when clicked.

## Preview duration

Suppose for simplicity a very uniform album of 10 songs where every track is exactly 4 minutes.
Configuration should allow for a total time of the slow unveiling; say, 1 week.
In this example, there are 4 * 60 * 10 = 2400 audio chunks, so there should be one new chunk
unveiled every 7 * 24 * 60 / 2400 = 4.2 minutes.

## Location

The user's location is used to seed the random number generator that determines the order in which
the audio snippets are unveiled. So that the user sees consistent results if they move around,
the location is rounded to the nearest tenth of a degree, meaning that everyone within the same
roughly 7x7 mile grid square will get the same seed.

Consider using whole degrees to further enhance the effect of caching.

For testing, and perhaps as an easter egg, here are some funny place names.
These can also be used if the user has location turned off.

| Place | Coordinates |
| ---- | ---- |
| Hell, Michigan | 42.4338° N, 83.9845° W |
| Zzyzx, California | 35.1428° N, 116.1039° W | 
| Why, Arizona | 32.2655° N, 112.7397° W |
| Llanfair­pwllgwyngyll­gogery­chwyrn­drobwll­llan­tysilio­gogo­goch, Wales | 53.2213° N, 4.2082° W |
| A certain city in Austria | 48.0673° N, 12.8633° E |


## Server

Ideally this would not require a database. Instead, the image and audio snippets can be generated
once and stored in S3, along with JSON metadata describing the (random, hard to guess) names of
those files as well as the plan for release (start date, duration). Then, a lambda will run
that returns an API response with partial metadata to the browser and a caching header specific
to the duration between new chunk releases.

It looks like [Vercel] will be a simple free place to host this - both the serverless compute
and the static storage of both media and web assets.

[Vercel]: https://vercel.com
