import {createContext, useContext} from 'react'

export const PreviewContext = createContext<{projectId: string} | undefined>(undefined)

/** TODO: needs inline documentation */
export const usePreviewContext = () => useContext(PreviewContext)
