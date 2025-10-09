/**
 * メールテンプレート
 */
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import type { CSSProperties } from "react";

interface VerificationEmailProps {
  verificationUrl: string;
}

function VerificationEmail({ verificationUrl }: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Heading style={styles.h1}>メールアドレスの認証</Heading>
          <Text style={styles.text}>アカウント登録ありがとうございます。</Text>
          <Text style={styles.text}>
            以下のボタンをクリックして、メールアドレスを認証してください:
          </Text>
          <Section style={styles.buttonContainer}>
            <Link href={verificationUrl} style={styles.button}>
              メールアドレスを認証
            </Link>
          </Section>
          <Text style={styles.hint}>
            ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください:
          </Text>
          <Text style={styles.urlText}>{verificationUrl}</Text>
          <Text style={styles.hint}>このリンクは24時間有効です。</Text>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            このメールに心当たりがない場合は、無視してください。
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function getVerificationEmailTemplate(
  params: VerificationEmailProps,
): Promise<{
  subject: string;
  html: string;
}> {
  const html = await render(<VerificationEmail {...params} />);

  return {
    subject: "メールアドレスを認証してください",
    html,
  };
}

const styles: Record<string, CSSProperties> = {
  main: {
    fontFamily: "sans-serif",
    lineHeight: "1.6",
    color: "#333",
  },
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "20px",
  },
  h1: {
    color: "#4a5568",
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  text: {
    fontSize: "16px",
    marginBottom: "16px",
  },
  buttonContainer: {
    margin: "30px 0",
  },
  button: {
    backgroundColor: "#4299e1",
    color: "#ffffff",
    padding: "12px 24px",
    textDecoration: "none",
    borderRadius: "5px",
    display: "inline-block",
  },
  hint: {
    color: "#718096",
    fontSize: "14px",
    marginBottom: "8px",
  },
  urlText: {
    color: "#718096",
    fontSize: "12px",
    wordBreak: "break-all",
    marginBottom: "16px",
  },
  hr: {
    border: "none",
    borderTop: "1px solid #e2e8f0",
    margin: "30px 0",
  },
  footer: {
    color: "#a0aec0",
    fontSize: "12px",
  },
};
