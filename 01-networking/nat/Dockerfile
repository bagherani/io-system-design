FROM alpine:3.20

RUN apk add --no-cache iptables iproute2 iputils

COPY init-nat.sh /init-nat.sh
RUN chmod +x /init-nat.sh

CMD ["/init-nat.sh"]
