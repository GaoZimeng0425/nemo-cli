const swaggerJson = {
  risk: 'https://prime-risk-dev1.metalpha.fund/swagger/cam-web.json',
  prime: 'https://prime-dev1.metalpha.fund/swagger-v2/prime-web.json',
}

const rcp = '/api/v2/rcp'
const getJsonURL = (url: string) => {
  if (url.includes(rcp)) {
    return swaggerJson.prime
  }
  return swaggerJson.risk
}

export const getJSON = async (url: string) => {
  const jsonURL = getJsonURL(url)
  const response = await fetch(jsonURL)
  const data = await response.json()

  return data
}

const a = await getJSON('/api/v2/rcp')
console.log('🚀 : a  =:', a)
