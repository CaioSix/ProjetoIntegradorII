# Estágio 1: Build da aplicação React + Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos de ambiente injetados no build (ex: via CI/CD ou --build-arg)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copia dependências primeiro para aproveitar o cache de camadas do Docker
COPY package*.json ./
RUN npm install

# Copia todo o código-fonte e compila
COPY . .
RUN npm run build

# Estágio 2: Servidor Nginx Alpine ultraleve para produção
FROM nginx:alpine

# Copia a pasta compilada (dist) para o diretório padrão do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a configuração do Nginx para suporte a SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
