import { ArrowLeft, ArrowRight, Notebook, Shuffle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ButtonGroup } from './components/ui/button-group'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from './components/ui/tooltip'
import { useEffect, useState } from 'react'

interface WBTMProps {
    className?: string
}

interface Link {
    name: string
    website: string
}

interface LinkData {
    current: Link
    prev: Link
    next: Link
    random: Link
}

export function WeBringTheMusic({ className }: WBTMProps) {
    const [linkData, setLinkData] = useState<LinkData | null>(null)

    const baseUrl = 'https://www.webringthemusic.info'

    useEffect(() => {
        async function getLinks() {
            const domain = `${window.location.hostname}/music`
            const url = `${baseUrl}/api/ring-by-domain`
            const searchUrl = `${url}?domain=${encodeURIComponent(domain)}`
            let response = await fetch(searchUrl)
            if (!response.ok) {
                response = await fetch(url)
            }
            const data = (await response.json()) as LinkData
            setLinkData(data)
        }
        getLinks().catch((e) => console.error(`Webring error: ${e}`))
    }, [])

    return (
        <ButtonGroup className={className}>
            <Button variant="outline" size="icon">
                <Tooltip>
                    <TooltipTrigger>
                        <a href={linkData?.prev?.website || '#'}>
                            <ArrowLeft />
                        </a>
                    </TooltipTrigger>
                    <TooltipContent>Previous</TooltipContent>
                </Tooltip>
            </Button>
            <Button variant="outline" size="icon">
                <Tooltip>
                    <TooltipTrigger>
                        <a href={linkData?.random?.website || '#'}>
                            <Shuffle />
                        </a>
                    </TooltipTrigger>
                    <TooltipContent>Random</TooltipContent>
                </Tooltip>
            </Button>
            <Button variant="outline" size="icon">
                <Tooltip>
                    <TooltipTrigger>
                        <a href={baseUrl}>
                            <img src="/webring-favicon.ico" />
                        </a>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="font-bold">WeBringTheMusic</p>
                    </TooltipContent>
                </Tooltip>
            </Button>
            <Button variant="outline" size="icon">
                <Tooltip>
                    <TooltipTrigger>
                        <a href={`${baseUrl}/directory`}>
                            <Notebook />
                        </a>
                    </TooltipTrigger>
                    <TooltipContent>Directory</TooltipContent>
                </Tooltip>
            </Button>
            <Button variant="outline" size="icon">
                <Tooltip>
                    <TooltipTrigger>
                        <a href={linkData?.next?.website || '#'}>
                            <ArrowRight />
                        </a>
                    </TooltipTrigger>
                    <TooltipContent>Next</TooltipContent>
                </Tooltip>
            </Button>
        </ButtonGroup>
    )
}
