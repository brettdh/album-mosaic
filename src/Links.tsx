import { DateTime } from 'luxon'

import type { Link } from '../lib/data'

interface LinksProps {
    links: Record<string, Link>
    releaseEnd: string
}

function isPast(date: string): boolean {
    return new Date() >= new Date(date)
}

const Links = ({ links, releaseEnd }: LinksProps) => {
    return (
        <>
            {links ? (
                <div className="flex flex-col items-start">
                    <ul className="p-0 list-none text-left">
                        {Object.entries(links).map(([label, { url, date }]) => {
                            const linkDate = date ?? releaseEnd
                            const linkDateShort =
                                DateTime.fromISO(linkDate).toFormat(
                                    'LLL dd, yyyy',
                                )
                            return (
                                <li key={label}>
                                    {isPast(linkDate) ? (
                                        <a target="_blank" href={url}>
                                            {label}
                                        </a>
                                    ) : (
                                        `${label}: ${linkDateShort}`
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ) : null}
        </>
    )
}

export default Links
