import { DateTime } from 'luxon'

import './Links.css'
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
                <div className="links">
                    <ul className="links">
                        {Object.entries(links).map(([label, { url, date }]) => {
                            const linkDate = date ?? releaseEnd
                            const linkDateShort =
                                DateTime.fromISO(linkDate).toFormat(
                                    'LLL dd, yyyy',
                                )
                            return (
                                <li>
                                    {isPast(linkDate) ? (
                                        <a href={url}>{label}</a>
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
